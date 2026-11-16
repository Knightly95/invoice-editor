import { useMutation, useQueryClient } from '@tanstack/react-query'
import { InvoiceFormValues } from 'app/components/InvoiceForm/schema'
import transformValuesToApi from 'app/components/InvoiceEdit/translators/transformFormValuesToAPI'
import { Invoice } from 'types/index'
import { useApi } from 'api'
import { useToast } from 'app/contexts/ToastContext'

export function useUpdateInvoice({
  onSuccess,
}: {
  onSuccess: (invoice: Invoice) => void
}) {
  const client = useApi()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: updateInvoice, isPending } = useMutation({
    mutationFn: async ({
      invoice,
      data,
    }: {
      invoice: Invoice
      data: InvoiceFormValues
    }) => {
      const response = await client.putInvoice(
        { id: Number(invoice.id) },
        transformValuesToApi(invoice, data)
      )
      return response.data
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({
        queryKey: ['invoice', String(invoice.id)],
      })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success({ message: 'Invoice saved successfully' })
      onSuccess(invoice)
    },
    onError: (error) => {
      toast.error({
        message: 'Failed to save invoice',
        description: error.message,
      })
    },
  })

  return { updateInvoice, isPending }
}
