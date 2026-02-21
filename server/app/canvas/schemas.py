import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator
from app.core.exceptions import ValidationException

class NodeSchema(BaseModel):
    id: str = Field(..., description="Unique node identifier")
    type: str = Field(..., description="Node component type (e.g. 'api', 'db')")
    position: Dict[str, float] = Field(..., description="X, Y coordinates")
    data: Dict[str, Any] = Field(..., description="Node metadata properties")
    
    # React Flow Optional Structural / Visual Properties
    parentNode: Optional[str] = None
    extent: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    style: Optional[Dict[str, Any]] = None
    zIndex: Optional[int] = None
    
    # Simulation Math Properties
    capacity_rps: Optional[float] = 1000.0
    base_latency_ms: Optional[float] = 50.0
    replicas: Optional[int] = 1
    queue_size: Optional[int] = 0
    rate_limit_rps: Optional[float] = None

class EdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    traffic_percent: Optional[float] = 1.0

class DesignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    nodes: List[NodeSchema] = []
    edges: List[EdgeSchema] = []

    @model_validator(mode='after')
    def validate_graph_integrity(self):
        nodes = self.nodes or []
        edges = self.edges or []
        
        node_ids = {n.id for n in nodes}
        
        # 1. Duplicate IDs
        if len(node_ids) != len(nodes):
            raise ValidationException("Duplicate Node IDs detected in graph.")
            
        # 2. Dangling Edges
        for edge in edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise ValidationException(f"Edge {edge.id} references non-existent nodes.")
                
        return self

class DesignCreate(DesignBase):
    pass

class DesignUpdate(DesignBase):
    version: int = Field(..., description="Current version for optimistic locking")

class DesignResponse(DesignBase):
    id: uuid.UUID
    user_id: uuid.UUID
    version: int
    
    class Config:
        from_attributes = True
