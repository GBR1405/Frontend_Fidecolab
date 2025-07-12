import React from 'react';
import { Stage, Layer, Line } from 'react-konva';

const DrawingPreview = ({ linesByUser }) => {
  const allLines = Object.values(linesByUser || {}).flat();

  return (
    <Stage width={800} height={600}>
      <Layer>
        {allLines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.color || '#000'}
            strokeWidth={line.strokeWidth || 3}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default DrawingPreview;
