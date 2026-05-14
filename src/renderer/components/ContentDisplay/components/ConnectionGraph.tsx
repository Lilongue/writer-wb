import React, { useEffect } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DetailedConnection, EntityType } from '../../../../common/types';

interface ConnectionGraphProps {
  connections: DetailedConnection[];
  currentEntity: {
    id: number | null;
    type: EntityType | null;
    name: string;
  };
}

const nodeWidth = 172;
const nodeHeight = 36;

const ConnectionGraph: React.FC<ConnectionGraphProps> = ({
  connections,
  currentEntity,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!currentEntity.id) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const mainNode: Node = {
      id: `${currentEntity.type}-${currentEntity.id}`,
      data: { label: currentEntity.name },
      position: { x: 0, y: 0 },
      type: 'default', // Changed from 'input' to 'default' to have both source and target handles
      draggable: false,
      style: {
        width: nodeWidth,
        height: nodeHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: 'bold',
        borderColor: '#1677ff',
        borderWidth: 2,
      },
    };

    const connectedNodes: Node[] = connections.map((conn, index) => ({
      id: `${conn.connectedEntity.type}-${conn.connectedEntity.id}`,
      data: { label: conn.connectedEntity.name },
      draggable: false,
      position: {
        x: (index % 2 === 0 ? -1 : 1) * (nodeWidth + 100),
        y: Math.floor((index + 1) / 2) * (nodeHeight + 80),
      },
      style: {
        width: nodeWidth,
        height: nodeHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    }));

    const nodeMap = new Map<string, Node>();
    connectedNodes.forEach((node) => nodeMap.set(node.id, node));
    nodeMap.set(mainNode.id, mainNode); // Ensure main node is present and central

    const finalNodes = Array.from(nodeMap.values());

    const finalEdges: Edge[] = connections.map((conn): Edge => {
      const sourceId = `${currentEntity.type}-${currentEntity.id}`;
      const targetId = `${conn.connectedEntity.type}-${conn.connectedEntity.id}`;

      return {
        id: `e-${conn.id}`,
        source: conn.connectionType === 'source' ? sourceId : targetId,
        target: conn.connectionType === 'source' ? targetId : sourceId,
        label: conn.description,
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
    });

    setNodes(finalNodes);
    setEdges(finalEdges);
  }, [connections, currentEntity, setNodes, setEdges]);

  return (
    <div className="connection-graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default ConnectionGraph;
