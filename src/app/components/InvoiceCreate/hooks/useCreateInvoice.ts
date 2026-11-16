import { useMutation, useQueryClient } from '@tanstack/react-query'
import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import transformValuesToApi from 'app/components/InvoiceCreate/translators/transformFormValuesToAPI'
import { Invoice } from 'types/index'
import { useApi } from 'api'
import { useToast } from 'app/contexts/ToastContext'

export function useCreateInvoice({
  onSuccess,
}: {
  onSuccess: (invoice: Invoice) => void
}) {
  const client = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: createInvoice, isPending } = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const response = await client.postInvoices(
        null,
        transformValuesToApi(data)
      )
      return response.data
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success({ message: 'Invoice created successfully' })
      onSuccess(invoice)
    },
    onError: (error) => {
      toast.error({
        message: 'Failed to create invoice',
        description: error.message,
      })
    },
  })

  return { createInvoice, isPending }
}
