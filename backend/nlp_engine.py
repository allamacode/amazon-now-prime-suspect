import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict
import uuid

class NLPEngine:
    def __init__(self):
        # Store recent profiles to compare against for clustering
        self.recent_profiles = []
        self.max_history = 200
        
        # Track established clusters (cluster_id -> list of user_ids)
        self.clusters = defaultdict(list)
        # Track user to cluster mapping (user_id -> cluster_id)
        self.user_clusters = {}

    def extract_features(self, text):
        """Extracts simple but effective stylometric features."""
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)
        
        if word_count == 0:
            return np.zeros(6)
            
        unique_words = len(set(words))
        
        # Features
        avg_word_length = sum(len(w) for w in words) / word_count
        uppercase_ratio = sum(1 for c in text if c.isupper()) / len(text) if len(text) > 0 else 0
        exclamation_freq = text.count('!') / word_count
        ellipsis_freq = text.count('...') / word_count
        lexical_diversity = unique_words / word_count
        
        return np.array([
            avg_word_length,
            uppercase_ratio,
            exclamation_freq,
            ellipsis_freq,
            lexical_diversity,
            word_count / 100.0 # Normalized roughly
        ])

    def detect_bot(self, features):
        """Simple heuristic for bot detection based on repetitiveness."""
        lexical_diversity = features[4]
        # Bots often repeat the exact same keywords (low diversity)
        if lexical_diversity < 0.4 and features[5] * 100 > 5:
            return True, 0.95
        return False, 0.1

    def process_message(self, message):
        text = message['text']
        user_id = message['user_id']
        ip_address = message.get('ip_address')
        region = message.get('region')
        
        features = self.extract_features(text)
        is_bot, bot_score = self.detect_bot(features)
        
        # Sockpuppet Detection (Clustering)
        cluster_id = self.user_clusters.get(user_id)
        
        if not cluster_id and len(self.recent_profiles) > 0:
            # Compare with history
            for profile in self.recent_profiles:
                matched_user_id = profile['user_id']
                
                if matched_user_id == user_id:
                    continue # Same user, skip
                    
                matched_ip = profile.get('ip_address')
                matched_region = profile.get('region')
                matched_features = profile['features']
                matched_text = profile.get('text', '')
                
                # Calculate stylometric similarity (Note: cosine sim on sparse 4D vectors is often 1.0)
                sim = cosine_similarity([features], [matched_features])[0][0]
                
                is_sockpuppet = False
                
                # Rule 1: Same IP address -> Immediate flag
                if ip_address and matched_ip and ip_address == matched_ip:
                    is_sockpuppet = True
                # Rule 2: Exact same text
                elif text == matched_text:
                    is_sockpuppet = True
                # Rule 3: High stylometric similarity + Same Region + Suspicious Style
                elif sim > 0.98 and region == matched_region:
                    # Require suspicious stylometric markers to prevent clustering generic positive reviews
                    is_suspicious = features[1] > 0.1 or features[2] > 0.1 or features[3] > 0.1
                    if is_suspicious:
                        is_sockpuppet = True
                    
                if is_sockpuppet:
                    # Assign to cluster
                    existing_cluster = self.user_clusters.get(matched_user_id)
                    if existing_cluster:
                        cluster_id = existing_cluster
                    else:
                        cluster_id = str(uuid.uuid4())[:8]
                        self.user_clusters[matched_user_id] = cluster_id
                        self.clusters[cluster_id].append(matched_user_id)
                        
                    self.user_clusters[user_id] = cluster_id
                    if user_id not in self.clusters[cluster_id]:
                        self.clusters[cluster_id].append(user_id)
                        
                    break # Found a cluster match, break loop

        # Update history
        self.recent_profiles.append({
            'user_id': user_id,
            'features': features,
            'ip_address': ip_address,
            'region': region,
            'text': text
        })
        
        if len(self.recent_profiles) > self.max_history:
            self.recent_profiles.pop(0)

        # Enrich message with NLP insights
        message['nlp'] = {
            'is_bot': is_bot,
            'bot_score': bot_score,
            'cluster_id': cluster_id,
            'features': features.tolist()
        }
        
        return message
