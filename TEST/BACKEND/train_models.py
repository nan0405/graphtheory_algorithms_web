"""
===========================================
ML MODELS TRAINING SCRIPT
===========================================
Script để train các ML models cho Algorithm Visualizer

Models được train:
1. BERT Pseudocode Classifier
2. Graph Neural Network
3. Algorithm Type Classifier
4. Reinforcement Learning Agent (Optional)
===========================================
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from typing import List, Dict, Tuple
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from transformers import BertTokenizer, BertModel
import pickle

# Import models từ main_ml.py
import sys
sys.path.append('..')
from main_ml import BERTPseudocodeParser, GraphNeuralNetwork, AlgorithmClassifier


# ==================== DATASET CLASSES ====================

class PseudocodeDataset(Dataset):
    """Dataset cho BERT Pseudocode Parser"""
    def __init__(self, data: List[Dict], tokenizer):
        self.data = data
        self.tokenizer = tokenizer
        self.action_types = [
            'init', 'add_open', 'remove_open', 'add_close',
            'update_dist', 'check_neighbor', 'compare', 'loop', 'end', 'general'
        ]
        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        text = item['text']
        label = self.action_types.index(item['action_type'])
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            padding='max_length',
            truncation=True,
            max_length=128,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'label': torch.tensor(label, dtype=torch.long)
        }


class GraphDataset(Dataset):
    """Dataset cho Graph Neural Network"""
    def __init__(self, graphs: List[Dict]):
        self.graphs = graphs
        
    def __len__(self):
        return len(self.graphs)
    
    def __getitem__(self, idx):
        graph = self.graphs[idx]
        
        # Convert to tensors
        node_features = torch.tensor(graph['node_features'], dtype=torch.float32)
        adjacency = torch.tensor(graph['adjacency_matrix'], dtype=torch.float32)
        labels = torch.tensor(graph['labels'], dtype=torch.long)
        
        return {
            'node_features': node_features,
            'adjacency': adjacency,
            'labels': labels
        }


# ==================== SYNTHETIC DATA GENERATION ====================

class SyntheticDataGenerator:
    """Tạo dữ liệu synthetic để train models"""
    
    @staticmethod
    def generate_dijkstra_pseudocode_samples(num_samples: int = 500) -> List[Dict]:
        """Tạo synthetic pseudocode samples cho Dijkstra"""
        samples = []
        
        # Templates cho mỗi action type
        templates = {
            'init': [
                "Khởi tạo dist[{node}] = infinity cho tất cả đỉnh",
                "Set dist[{start}] = 0",
                "Initialize priority queue Q",
                "Tạo tập Open = {{start}}",
                "Tạo tập Close = empty set"
            ],
            'add_open': [
                "Thêm đỉnh {node} vào Open",
                "Add vertex {node} to priority queue",
                "Enqueue {node} with priority {value}",
                "Push {node} to Open set"
            ],
            'remove_open': [
                "Lấy đỉnh {node} từ Open",
                "Extract minimum from Open",
                "Pop {node} from priority queue",
                "Dequeue vertex {node}"
            ],
            'add_close': [
                "Thêm {node} vào Close",
                "Mark {node} as visited",
                "Add {node} to closed set",
                "Set visited[{node}] = true"
            ],
            'update_dist': [
                "Cập nhật dist[{node}] = {value}",
                "Relax edge ({from}, {to})",
                "Update distance to {node}",
                "Set dist[{node}] = dist[{from}] + weight({from},{to})"
            ],
            'check_neighbor': [
                "Xét các đỉnh kề của {node}",
                "For each neighbor {neighbor} of {node}",
                "Check adjacent vertices of {node}",
                "Iterate through neighbors"
            ],
            'compare': [
                "If dist[{node1}] < dist[{node2}]",
                "So sánh dist[{node1}] và dist[{node2}]",
                "Compare distances",
                "Check if new path is shorter"
            ],
            'loop': [
                "While Open is not empty",
                "Lặp cho đến khi Open rỗng",
                "For each vertex in graph",
                "Repeat until all vertices processed"
            ],
            'end': [
                "Kết thúc thuật toán",
                "Return shortest path",
                "Algorithm completed",
                "Done processing"
            ]
        }
        
        nodes = ['a', 'b', 'c', 'd', 'e', 'f', 'start', 'end']
        
        for action_type, template_list in templates.items():
            for _ in range(num_samples // len(templates)):
                template = np.random.choice(template_list)
                
                # Replace placeholders
                text = template
                text = text.replace('{node}', np.random.choice(nodes))
                text = text.replace('{start}', 'a')
                text = text.replace('{from}', np.random.choice(nodes))
                text = text.replace('{to}', np.random.choice(nodes))
                text = text.replace('{neighbor}', np.random.choice(nodes))
                text = text.replace('{node1}', np.random.choice(nodes))
                text = text.replace('{node2}', np.random.choice(nodes))
                text = text.replace('{value}', str(np.random.randint(1, 100)))
                
                samples.append({
                    'text': text,
                    'action_type': action_type
                })
        
        return samples
    
    @staticmethod
    def generate_graph_samples(num_samples: int = 300) -> List[Dict]:
        """Tạo synthetic graph samples"""
        graphs = []
        
        for _ in range(num_samples):
            num_nodes = np.random.randint(4, 12)
            
            # Random node features
            node_features = np.random.randn(num_nodes, 16)
            
            # Random adjacency matrix (sparse)
            adjacency = np.random.rand(num_nodes, num_nodes) < 0.3
            adjacency = adjacency.astype(float)
            
            # Make symmetric for undirected graph
            adjacency = (adjacency + adjacency.T) / 2
            
            # Normalize
            row_sum = adjacency.sum(axis=1, keepdims=True)
            row_sum[row_sum == 0] = 1
            adjacency = adjacency / row_sum
            
            # Random labels (node importance)
            labels = np.random.randint(0, 3, size=num_nodes)
            
            graphs.append({
                'node_features': node_features,
                'adjacency_matrix': adjacency,
                'labels': labels
            })
        
        return graphs


# ==================== TRAINING FUNCTIONS ====================

def train_bert_classifier(model: BERTPseudocodeParser, 
                          train_loader: DataLoader,
                          val_loader: DataLoader,
                          num_epochs: int = 10,
                          learning_rate: float = 2e-5,
                          device: str = 'cpu'):
    """Train BERT Pseudocode Classifier"""
    
    print("\n" + "="*50)
    print("🤖 TRAINING BERT PSEUDOCODE CLASSIFIER")
    print("="*50)
    
    model = model.to(device)
    optimizer = optim.AdamW(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()
    
    best_val_acc = 0.0
    
    for epoch in range(num_epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch in train_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            # Note: Model expects text string, cần modify
            # Để đơn giản, ta train trực tiếp classifier part
            with torch.no_grad():
                inputs = {'input_ids': input_ids, 'attention_mask': attention_mask}
                outputs = model.bert(**inputs)
                cls_embedding = outputs.last_hidden_state[:, 0, :]
            
            logits = model.classifier(cls_embedding)
            loss = criterion(logits, labels)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(logits, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        train_acc = 100 * train_correct / train_total
        avg_train_loss = train_loss / len(train_loader)
        
        # Validation phase
        model.eval()
        val_correct = 0
        val_total = 0
        val_loss = 0.0
        
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                labels = batch['label'].to(device)
                
                inputs = {'input_ids': input_ids, 'attention_mask': attention_mask}
                outputs = model.bert(**inputs)
                cls_embedding = outputs.last_hidden_state[:, 0, :]
                logits = model.classifier(cls_embedding)
                
                loss = criterion(logits, labels)
                val_loss += loss.item()
                
                _, predicted = torch.max(logits, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total
        avg_val_loss = val_loss / len(val_loader)
        
        print(f"Epoch {epoch+1}/{num_epochs}")
        print(f"  Train Loss: {avg_train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"  Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), 'models/bert_classifier_best.pth')
            print(f"  ✅ Saved best model (Val Acc: {val_acc:.2f}%)")
    
    print(f"\n🎯 Best Validation Accuracy: {best_val_acc:.2f}%")
    return model


def train_gnn(model: GraphNeuralNetwork,
              train_loader: DataLoader,
              val_loader: DataLoader,
              num_epochs: int = 50,
              learning_rate: float = 0.01,
              device: str = 'cpu'):
    """Train Graph Neural Network"""
    
    print("\n" + "="*50)
    print("🕸️  TRAINING GRAPH NEURAL NETWORK")
    print("="*50)
    
    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()
    
    best_val_acc = 0.0
    
    for epoch in range(num_epochs):
        # Training
        model.train()
        train_loss = 0.0
        
        for batch in train_loader:
            node_features = batch['node_features'].to(device)
            adjacency = batch['adjacency'].to(device)
            labels = batch['labels'].to(device)
            
            optimizer.zero_grad()
            
            # Forward
            output = model(node_features, adjacency)
            
            # Loss (node classification)
            loss = criterion(output, labels)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        avg_train_loss = train_loss / len(train_loader)
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch in val_loader:
                node_features = batch['node_features'].to(device)
                adjacency = batch['adjacency'].to(device)
                labels = batch['labels'].to(device)
                
                output = model(node_features, adjacency)
                loss = criterion(output, labels)
                val_loss += loss.item()
                
                _, predicted = torch.max(output, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total if val_total > 0 else 0
        avg_val_loss = val_loss / len(val_loader)
        
        if epoch % 10 == 0:
            print(f"Epoch {epoch}/{num_epochs}")
            print(f"  Train Loss: {avg_train_loss:.4f}")
            print(f"  Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), 'models/gnn_best.pth')
    
    print(f"\n🎯 Best Validation Accuracy: {best_val_acc:.2f}%")
    return model


# ==================== MAIN TRAINING PIPELINE ====================

def main():
    """Main training pipeline"""
    
    print("\n" + "="*60)
    print("🚀 ML ALGORITHM VISUALIZER - TRAINING PIPELINE")
    print("="*60)
    
    # Create models directory
    Path('models').mkdir(exist_ok=True)
    
    # Device setup
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"\n💻 Using device: {device}")
    
    # ========== 1. GENERATE SYNTHETIC DATA ==========
    print("\n📊 Generating synthetic training data...")
    
    generator = SyntheticDataGenerator()
    
    # Pseudocode data
    pseudo_samples = generator.generate_dijkstra_pseudocode_samples(num_samples=1000)
    print(f"  ✅ Generated {len(pseudo_samples)} pseudocode samples")
    
    # Graph data
    graph_samples = generator.generate_graph_samples(num_samples=500)
    print(f"  ✅ Generated {len(graph_samples)} graph samples")
    
    # ========== 2. TRAIN BERT CLASSIFIER ==========
    print("\n📚 Preparing BERT dataset...")
    
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    pseudo_dataset = PseudocodeDataset(pseudo_samples, tokenizer)
    
    # Split dataset
    train_size = int(0.8 * len(pseudo_dataset))
    val_size = len(pseudo_dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        pseudo_dataset, [train_size, val_size]
    )
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    
    bert_model = BERTPseudocodeParser(num_action_types=10)
    trained_bert = train_bert_classifier(
        bert_model, train_loader, val_loader, 
        num_epochs=5, device=device
    )
    
    # ========== 3. TRAIN GNN ==========
    print("\n📚 Preparing Graph dataset...")
    
    graph_dataset = GraphDataset(graph_samples)
    train_size = int(0.8 * len(graph_dataset))
    val_size = len(graph_dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        graph_dataset, [train_size, val_size]
    )
    
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)
    
    gnn_model = GraphNeuralNetwork(input_dim=16, hidden_dim=32, output_dim=3)
    trained_gnn = train_gnn(
        gnn_model, train_loader, val_loader,
        num_epochs=50, device=device
    )
    
    # ========== 4. SAVE FINAL MODELS ==========
    print("\n💾 Saving models...")
    torch.save(trained_bert.state_dict(), 'models/bert_final.pth')
    torch.save(trained_gnn.state_dict(), 'models/gnn_final.pth')
    print("  ✅ Models saved to ./models/")
    
    # ========== 5. TRAINING SUMMARY ==========
    print("\n" + "="*60)
    print("✨ TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\nTrained Models:")
    print("  1. ✅ BERT Pseudocode Classifier")
    print("  2. ✅ Graph Neural Network")
    print("\nNext Steps:")
    print("  1. Load models in main_ml.py")
    print("  2. Test with real algorithm data")
    print("  3. Fine-tune if needed")
    print("="*60)


if __name__ == "__main__":
    main()