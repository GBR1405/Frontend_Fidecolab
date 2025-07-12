import React from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';

const DrawingPreview = ({ linesByUser }) => {
  const width = 800;
  const height = 600;

  const allLines = Object.values(linesByUser || {}).flat();

  return (
    <Stage width={width} height={height}>
      <Layer>
        {allLines.length === 0 ? (
          <Text
            text="Equipo no ha dibujado"
            x={10}
            y={height - 40}
            fontSize={24}
            fill="gray"
            rotation={-45}
          />
        ) : (
          allLines.map((line, index) => (
            <Line
              key={index}
              points={line.points}
              stroke={line.color || '#000'}
              strokeWidth={line.strokeWidth || 3}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))
        )}
      </Layer>
    </Stage>
  );
};

export default DrawingPreview;
