import { createContext, useContext } from 'react'

interface InvoiceFormContextValue {
  isEdit: boolean
}

const InvoiceFormContext = createContext<InvoiceFormContextValue>({
  isEdit: false,
})

export const useInvoiceFormContext = (): InvoiceFormContextValue =>
  useContext(InvoiceFormContext)

export const InvoiceFormProvider = InvoiceFormContext.Provider
