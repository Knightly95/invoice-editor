import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from 'api'
import { useToast } from 'app/contexts/ToastContext'
import { Invoice } from 'types'

export function useFinalizeInvoice() {
  const client = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: finalizeInvoice, isPending } = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const response = await client.putInvoice(
        { id: invoice.id },
        { invoice: { id: invoice.id, finalized: true } }
      )
      return response.data
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({
        queryKey: ['invoice', String(invoice.id)],
      })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success({ message: 'Invoice finalized successfully' })
    },
    onError: (error) => {
      toast.error({
        message: 'Failed to finalize invoice',
        description: error.message,
      })
    },
  })

  return { finalizeInvoice, isPending }
}
