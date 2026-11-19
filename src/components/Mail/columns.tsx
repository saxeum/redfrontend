import type { ColumnDef } from "@tanstack/react-table"

import type { MailMessageResponse } from "@/client"
import type { DataTableFeatures } from "@/components/Common/DataTable"
import { Button } from "@/components/ui/button"

const formatReceived = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

export const createMailColumns = (
  onView: (id: string) => void,
): ColumnDef<DataTableFeatures, MailMessageResponse>[] => [
  {
    accessorKey: "from_address",
    header: "From",
    cell: ({ row }) => (
      <span className="block max-w-56 truncate">
        {row.original.from_address}
      </span>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="block max-w-64 truncate font-medium">
        {row.original.subject || "(no subject)"}
      </span>
    ),
  },
  {
    accessorKey: "snippet",
    header: "Preview",
    cell: ({ row }) => (
      <span className="block max-w-80 truncate text-muted-foreground">
        {row.original.snippet}
      </span>
    ),
  },
  {
    accessorKey: "received_at",
    header: "Received",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatReceived(row.original.received_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(row.original.id)}
        >
          View
        </Button>
      </div>
    ),
  },
]
