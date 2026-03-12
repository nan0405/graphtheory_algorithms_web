"""
Algorithm Visualizer Backend - Smart Pseudocode Parser
Phân tích mã giả tự nhiên và tự động tạo visualization steps
Hỗ trợ biến động như {startnode}, {neighbornode}, {endnode}, etc
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional, Set
import re
import json

app = FastAPI(title="Algorithm Visualizer API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================
class GraphNode(BaseModel):
    id: str

class GraphEdge(BaseModel):
    from_node: Optional[str] = Field(None, alias='from')
    to: Optional[str] = None
    weight: Optional[int] = None
    
    model_config = ConfigDict(populate_by_name=True)

class GraphData(BaseModel):
    nodes: List[str]
    edges: List[GraphEdge]

class PseudocodeStep(BaseModel):
    line: str
    voice: Optional[str] = ""

class AlgorithmRequest(BaseModel):
    name: str
    description: str
    pseudocode: List[PseudocodeStep]
    graph: Optional[GraphData] = None
    start_node: Optional[str] = None
    end_node: Optional[str] = None

class VisualizationStep(BaseModel):
    step: str
    pseudo: str
    explain: str
    voice: str
    duration: int
    colors: List[str]
    highlight: Dict[str, List[str]]

class AlgorithmResponse(BaseModel):
    algorithm: Dict[str, str]
    graph: Optional[GraphData] = None
    steps: List[VisualizationStep]

# ==================== SMART PARSER ====================
class PseudocodeParser:
    """
    Parser thông minh để phân tích mã giả tự nhiên
    Hỗ trợ biến động: {startnode}, {endnode}, {currentnode}, {neighbornode}, etc
    Tự động extract nodes từ pseudocode
    """
    
    def __init__(self):
        # Mapping các keywords thường gặp
        self.action_patterns = {
            'init': r'(khởi tạo|initialize|init|set|tạo)',
            'add_open': r'(thêm.*vào.*open|add.*to.*open|push.*queue|enqueue)',
            'remove_open': r'(lấy.*từ.*open|remove.*from.*open|pop|dequeue|extract)',
            'add_close': r'(thêm.*vào.*close|add.*to.*close|mark.*visited)',
            'update_dist': r'(cập nhật.*dist|update.*distance|relax)',
            'check_neighbor': r'(xét.*neighbor|check.*adjacent|for.*neighbor)',
            'compare': r'(so sánh|compare|if.*<|if.*>)',
            'loop': r'(lặp|while|for|repeat)',
            'end': r'(kết thúc|end|done|return)'
        }
        
        # Mapping màu cho từng loại action
        self.action_colors = {
            'init': ['white'],
            'add_open': ['yellow'],
            'remove_open': ['red'],
            'add_close': ['blue'],
            'update_dist': ['green'],
            'check_neighbor': ['yellow'],
            'compare': ['yellow'],
            'loop': ['yellow'],
            'end': ['blue']
        }
    
    def _extract_all_nodes_from_steps(self, pseudocode_steps: List[PseudocodeStep]) -> Set[str]:
        """
        Tự động extract tất cả các nodes từ pseudocode steps
        Tìm các pattern như [a], [b], {xxx} và extract values
        """
        all_nodes = set()
        
        for pseudo_step in pseudocode_steps:
            line = pseudo_step.line
            # Tìm các ngoặc vuông [a], [b], [c]
            bracket_matches = re.findall(r'\[([a-z])\]', line, re.IGNORECASE)
            all_nodes.update(bracket_matches)
        
        return all_nodes
    
    def _replace_variables_in_pseudo(self, pseudo_line: str, context: dict, start_node: str, end_node: str) -> str:
        """
        Thay thế biến động trong pseudo line
        {startnode} → a
        {endnode} → f
        {currentnode} → x (node hiện tại)
        {neighbornode} → các node kề
        """
        result = pseudo_line
        
        # Thay {startnode}
        if start_node:
            result = result.replace('{startnode}', start_node)
        
        # Thay {endnode}
        if end_node:
            result = result.replace('{endnode}', end_node)
        
        # Thay {currentnode}
        if context.get('current_node'):
            result = result.replace('{currentnode}', context['current_node'])
        
        # Thay {allnodes} - tất cả các nodes
        all_nodes_str = ', '.join(sorted(context.get('all_nodes', [])))
        if all_nodes_str:
            result = result.replace('{allnodes}', all_nodes_str)
        
        # Thay {neighbornode} - các node kề của current
        neighbors = context.get('neighbors', {}).get(context.get('current_node'), [])
        if neighbors:
            neighbors_str = ', '.join(sorted(neighbors))
            result = result.replace('{neighbornode}', neighbors_str)
        
        return result
    
    def _extract_nodes_from_line(self, line: str) -> List[str]:
        """
        Extract nodes từ một dòng pseudocode
        Tìm [a], [b], [c] hoặc {xxx}
        """
        nodes = []
        
        # Tìm trong ngoặc vuông [a], [b]
        bracket_matches = re.findall(r'\[([a-z])\]', line, re.IGNORECASE)
        nodes.extend(bracket_matches)
        
        # Tìm biến độc lập a, b, c (chữ cái đơn)
        single_letters = re.findall(r'\b([a-z])\b', line, re.IGNORECASE)
        for letter in single_letters:
            if letter not in nodes:
                nodes.append(letter)
        
        # Loại bỏ duplicates nhưng giữ thứ tự
        seen = set()
        unique_nodes = []
        for node in nodes:
            if node.lower() not in seen:
                unique_nodes.append(node.lower())
                seen.add(node.lower())
        
        return unique_nodes
        
    def parse(self, pseudocode_steps: List[PseudocodeStep], graph_data: Optional[GraphData], 
              start_node: str = None, end_node: str = None) -> List[VisualizationStep]:
        """
        Parse mã giả và tạo visualization steps
        Thay thế biến động và tự động extract nodes
        """
        steps = []
        step_counter = 0
        
        # ========== Extract nodes từ steps ==========
        if graph_data:
            nodes = graph_data.nodes
        else:
            # Tự động extract nodes từ pseudocode
            nodes = sorted(list(self._extract_all_nodes_from_steps(pseudocode_steps)))
        
        # Context để track trạng thái thuật toán
        context = {
            'open_set': set(),
            'close_set': set(),
            'current_node': None,
            'distances': {node: float('inf') for node in nodes},
            'neighbors': {},
            'all_nodes': set(nodes),
            'start_node': start_node,
            'end_node': end_node
        }
        
        # Build adjacency nếu có graph data
        if graph_data:
            context['neighbors'] = self._build_adjacency(graph_data)
        
        if start_node:
            context['distances'][start_node] = 0
            context['current_node'] = start_node
        
        for idx, pseudo_step in enumerate(pseudocode_steps):
            line = pseudo_step.line
            line_lower = line.lower()
            
            # ========== QUAN TRỌNG: Thay thế biến động ==========
            replaced_pseudo = self._replace_variables_in_pseudo(line, context, start_node, end_node)
            
            # Detect action type
            action_type = self._detect_action(line_lower)
            
            # Extract nodes từ pseudocode đã được thay thế
            highlight_nodes = self._extract_nodes_from_line(replaced_pseudo)
            
            # Generate visualization step
            vis_step = self._generate_step(
                step_counter, 
                replaced_pseudo,  # Dùng pseudo đã thay thế
                action_type, 
                highlight_nodes,
                context
            )
            
            steps.append(vis_step)
            step_counter += 1
            
            # Update context based on action
            self._update_context(action_type, highlight_nodes, context)
        
        return steps
    
    def _detect_action(self, line: str) -> str:
        """Detect loại action từ mã giả"""
        for action, pattern in self.action_patterns.items():
            if re.search(pattern, line, re.IGNORECASE):
                return action
        return 'general'
    
    def _generate_step(self, step_num: int, pseudo_line: str, 
                       action_type: str, highlight_nodes: List[str], context: dict) -> VisualizationStep:
        """Generate một visualization step"""
        
        colors = self.action_colors.get(action_type, ['yellow'])
        
        # Auto-generate explanation
        explain = self._generate_explanation(action_type, highlight_nodes, context)
        
        # Build highlight từ nodes được extract
        highlight = {
            'nodes': highlight_nodes,
            'edges': self._get_relevant_edges(highlight_nodes, context)
        }
        
        return VisualizationStep(
            step=f"Bước {step_num + 1}",
            pseudo=pseudo_line,
            explain=explain,
            voice=explain,
            duration=1500,
            colors=colors,
            highlight=highlight
        )
    
    def _generate_explanation(self, action_type: str, nodes: List[str], context: dict) -> str:
        """Tự động generate explanation dựa trên action"""
        nodes_str = ", ".join(nodes) if nodes else ""
        
        explanations = {
            'init': f"Khởi tạo thuật toán",
            'add_open': f"Thêm đỉnh {nodes_str} vào tập Open" if nodes_str else "Thêm vào tập Open",
            'remove_open': f"Lấy đỉnh {nodes_str} từ Open" if nodes_str else "Lấy đỉnh từ Open",
            'add_close': f"Đánh dấu đỉnh {nodes_str} đã hoàn thành" if nodes_str else "Thêm vào Close",
            'update_dist': f"Cập nhật khoảng cách cho đỉnh {nodes_str}" if nodes_str else "Cập nhật khoảng cách",
            'check_neighbor': f"Kiểm tra các đỉnh kề" if nodes_str else "Kiểm tra đỉnh kề",
            'compare': f"So sánh khoảng cách",
            'loop': "Lặp thuật toán",
            'end': "Hoàn thành thuật toán"
        }
        
        return explanations.get(action_type, f"Xử lý")
    
    def _get_relevant_edges(self, nodes: List[str], context: dict) -> List[str]:
        """Lấy các cạnh liên quan đến nodes"""
        edges = []
        neighbors = context.get('neighbors', {})
        
        for node in nodes:
            if node in neighbors:
                for neighbor in neighbors[node]:
                    edge_id = f"{node}-{neighbor}"
                    if edge_id not in edges:
                        edges.append(edge_id)
        
        return edges
    
    def _update_context(self, action_type: str, nodes: List[str], context: dict):
        """Update context sau mỗi step"""
        if action_type == 'add_open' and nodes:
            context['open_set'].update(nodes)
        elif action_type == 'remove_open' and nodes:
            node = nodes[0]
            context['open_set'].discard(node)
            context['current_node'] = node
        elif action_type == 'add_close' and nodes:
            context['close_set'].update(nodes)
    
    def _build_adjacency(self, graph_data: GraphData) -> Dict[str, List[str]]:
        """Build adjacency list từ graph data"""
        adj = {node: [] for node in graph_data.nodes}
        
        for edge in graph_data.edges:
            from_node = edge.from_node
            if from_node and edge.to and from_node in adj:
                adj[from_node].append(edge.to)
        
        return adj


# ==================== API ENDPOINTS ====================
parser = PseudocodeParser()

@app.post("/api/parse-algorithm", response_model=AlgorithmResponse)
async def parse_algorithm(request: AlgorithmRequest):
    """
    Parse mã giả tự nhiên và tạo visualization JSON
    Hỗ trợ biến động: {startnode}, {endnode}, {currentnode}, {neighbornode}, {allnodes}
    """
    try:
        # Parse pseudocode
        steps = parser.parse(
            request.pseudocode,
            request.graph,
            request.start_node,
            request.end_node
        )
        
        response = AlgorithmResponse(
            algorithm={
                "name": request.name,
                "description": request.description
            },
            graph=request.graph,
            steps=steps
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Algorithm Visualizer Backend is running"}

@app.get("/")
async def root():
    return {
        "message": "Algorithm Visualizer API",
        "docs": "/docs",
        "endpoints": {
            "parse": "/api/parse-algorithm (POST)",
            "health": "/health (GET)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)