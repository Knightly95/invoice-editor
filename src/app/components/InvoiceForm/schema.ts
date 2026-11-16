import * as yup from 'yup'
import type { Customer, Product } from 'types'

export const invoiceFormSchema = yup.object({
  customer: yup.mixed<Customer>().required('Customer is required'),
  issueDate: yup
    .date()
    .typeError('Issue date is required')
    .required('Issue date is required'),
  deadline: yup
    .date()
    .typeError('Deadline is required')
    .required('Deadline is required')
    .min(
      yup.ref('issueDate'),
      'Deadline cannot be earlier than the issue date'
    ),
  invoice_lines: yup
    .array(
      yup.object({
        id: yup.string().optional(),
        // When _destroy is true the line is pending deletion — product/quantity are
        // irrelevant and must not block form submission.
        _destroy: yup.boolean().optional(),
        product: yup
          .mixed<Product>()
          .optional()
          .nullable()
          .when('_destroy', {
            is: true,
            then: (s) => s.optional(),
            otherwise: (s) =>
              s.test(
                'product-required',
                'Product is required',
                (value) => value != null
              ),
          }),
        quantity: yup
          .number()
          .typeError('Quantity must be a number')
          .when('_destroy', {
            is: true,
            then: (s) => s.optional().nullable(),
            otherwise: (s) =>
              s
                .positive('Quantity must be greater than 0')
                .required('Quantity is required'),
          }),
      })
    )
    .test(
      'at-least-one-active',
      'At least one invoice line is required',
      (lines) => (lines ?? []).filter((l) => !l._destroy).length > 0
    )
    .required(),
})

export type InvoiceFormValues = yup.InferType<typeof invoiceFormSchema>
