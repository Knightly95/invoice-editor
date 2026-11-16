import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from 'api'
import { useToast } from 'app/contexts/ToastContext'
import { Invoice } from 'types'

export function useTogglePaid() {
  const client = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: togglePaid, isPending } = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const response = await client.putInvoice(
        { id: invoice.id },
        { invoice: { id: invoice.id, paid: !invoice.paid } }
      )
      return response.data
    },
    // Optimistic update: flip paid immediately so the UI responds instantly
    onMutate: async (invoice: Invoice) => {
      const queryKey = ['invoice', String(invoice.id)]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Invoice>(queryKey)
      queryClient.setQueryData<Invoice>(queryKey, (old) =>
        old ? { ...old, paid: !old.paid } : old
      )
      return { previous, queryKey }
    },
    onError: (error, _invoice, context) => {
      // Roll back to the pre-mutation snapshot on failure
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
      toast.error({
        message: 'Failed to update paid status',
        description: error.message,
      })
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({
        queryKey: ['invoice', String(invoice.id)],
      })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success({
        message: invoice.paid
          ? 'Invoice marked as paid'
          : 'Invoice marked as unpaid',
      })
    },
  })

  return { togglePaid, isPending }
}
