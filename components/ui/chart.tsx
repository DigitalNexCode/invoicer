import { cn } from "@/lib/utils"
import { TooltipProps } from "recharts"
import { Card } from "@/components/ui/card"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({
  className,
  config,
  children,
  ...props
}: ChartProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

export function ChartTooltip({ active, payload, label }: TooltipProps<any, any>) {
  if (!active || !payload) return null

  return (
    <Card className="p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {label}
          </span>
          {payload.map((item: any) => (
            <span key={item.name} className="font-bold">
              {item.value}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

export const ChartTooltipContent = ChartTooltip 