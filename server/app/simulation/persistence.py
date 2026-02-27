from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.security import generate_uuid

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    design_id = Column(UUID(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    total_rps_peak = Column(Float, default=0.0)
    avg_latency = Column(Float, default=0.0)
    status = Column(String, default="running") # "running", "completed", "failed"

    design = relationship("Design")
    ticks = relationship("SimulationTick", back_populates="run", cascade="all, delete-orphan")

class SimulationTick(Base):
    __tablename__ = "simulation_ticks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    run_id = Column(UUID(as_uuid=True), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    tick_index = Column(Integer, nullable=False)
    metrics = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    run = relationship("SimulationRun", back_populates="ticks")

class SimulationExport(Base):
    __tablename__ = "simulation_exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    design_id = Column(UUID(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    format = Column(String, nullable=False) # PNG, PDF, SVG, JPG, GIF
    status = Column(String, default="queued") # queued, processing, completed, failed
    
    file_url = Column(String, nullable=True) # MinIO path
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    design = relationship("Design")
