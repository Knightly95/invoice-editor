import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from 'api'
import { useToast } from 'app/contexts/ToastContext'
import { Invoice } from 'types'

export function useDeleteInvoice({ onSuccess }: { onSuccess: () => void }) {
  const client = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: deleteInvoice, isPending } = useMutation({
    mutationFn: async (invoice: Invoice) => {
      await client.deleteInvoice({ id: invoice.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success({ message: 'Invoice deleted successfully' })
      onSuccess()
    },
    onError: (error) => {
      toast.error({
        message: 'Failed to delete invoice',
        description: error.message,
      })
    },
  })

  return { deleteInvoice, isPending }
}
