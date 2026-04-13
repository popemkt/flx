import { Handle, Position } from '@xyflow/react'
import { PORT_COLORS, type PortDataType } from '@/types/port'

interface PortHandleProps {
  type: 'source' | 'target'
  portId: string
  dataType: PortDataType
  label: string
  position: Position
  style?: React.CSSProperties
}

export function PortHandle({ type, portId, dataType, label, position, style }: PortHandleProps) {
  const id = `${portId}::${dataType}`
  const color = PORT_COLORS[dataType]
  const isLeft = position === Position.Left

  return (
    <div className="relative flex items-center" style={{ justifyContent: isLeft ? 'flex-start' : 'flex-end' }}>
      <Handle
        type={type}
        position={position}
        id={id}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          border: `2px solid ${color}`,
          ...style,
        }}
      />
      <span
        className="text-[10px] text-muted-foreground px-1.5 select-none"
        style={{ [isLeft ? 'marginLeft' : 'marginRight']: 4 }}
      >
        {label}
      </span>
    </div>
  )
}
