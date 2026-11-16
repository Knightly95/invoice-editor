import { useCallback, useEffect, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useBlocker, type BlockerFunction } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import { App } from 'antd'

import { invoiceFormSchema, InvoiceFormValues } from './schema'
import { Invoice } from 'types'
import InvoiceBottomBarAction from './InvoiceBottomBarAction'
import InvoiceMainDataField from './InvoiceMainDataField'
import { useInvoiceFormDefaultValues } from './useInvoiceFormDefaultValues'
import InvoiceLinesFields from './InvoiceLinesFields'
import { InvoiceFormProvider } from './InvoiceFormContext'

interface InvoiceFormProps {
  invoice: Invoice | null
  onCancel: () => void
  /** Called with the validated form data and a `onSaveSuccess` callback.
   *  The parent MUST call `onSaveSuccess()` once the API mutation succeeds —
   *  that is the signal to mark the form as clean and unblock navigation. */
  onSave: (data: InvoiceFormValues, onSaveSuccess: () => void) => void
  /** When provided, seeds the form with these values instead of deriving them
   *  from `invoice`. Used for the "Use as template" flow where line IDs and
   *  dates are intentionally stripped so the operator starts a fresh invoice. */
  overrideDefaultValues?: Partial<InvoiceFormValues>
}

const InvoiceForm = ({
  invoice,
  onCancel,
  onSave,
  overrideDefaultValues,
}: InvoiceFormProps) => {
  const { modal } = App.useApp()
  const derivedDefaultValues = useInvoiceFormDefaultValues(invoice)
  const defaultValues = overrideDefaultValues ?? derivedDefaultValues

  const {
    handleSubmit,
    control,
    formState: { isDirty },
    reset,
    setValue,
  } = useForm<InvoiceFormValues>({
    defaultValues,
    resolver: yupResolver(invoiceFormSchema) as Resolver<InvoiceFormValues>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  })

  // Refs let the BlockerFunction read the latest values synchronously at
  // navigation time, before React flushes any pending state updates.
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty
  // Set to true synchronously in onSaveSuccess so the blocker lets the
  // programmatic navigate() through, even though isDirty hasn't re-rendered
  // to false yet (reset schedules an async state update).
  const skipBlockerRef = useRef(false)

  const shouldBlock = useCallback<BlockerFunction>(
    () => isDirtyRef.current && !skipBlockerRef.current,
    []
  )

  const blocker = useBlocker(shouldBlock)

  // When the router blocks a navigation attempt, prompt the user to confirm.
  useEffect(() => {
    if (blocker.state !== 'blocked') return

    modal.confirm({
      title: 'Unsaved changes',
      content:
        'You have unsaved changes. If you leave, your changes will be lost.',
      okText: 'Leave',
      okType: 'danger',
      cancelText: 'Stay',
      onOk: blocker.proceed,
      onCancel: blocker.reset,
    })
  }, [blocker, modal])

  const handleSave = handleSubmit((data) => {
    // onSaveSuccess is called by the parent only on API success. Setting the
    // ref synchronously lets the BlockerFunction see it before React flushes
    // the reset() state update, so navigate() in onSuccess is never blocked.
    onSave(data, () => {
      skipBlockerRef.current = true
      reset(data)
    })
  })

  return (
    <InvoiceFormProvider value={{ isEdit: !!invoice }}>
      <form onSubmit={handleSave}>
        <div
          style={{
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            boxShadow: 'var(--card-shadow)',
            padding: '20px 24px',
          }}
        >
          {invoice && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    background: '#f59e0b',
                    flexShrink: 0,
                  }}
                />
                Edited / New
              </span>
              {invoice && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 3,
                      height: 14,
                      borderRadius: 2,
                      background: '#ef4444',
                      flexShrink: 0,
                    }}
                  />
                  Will be removed
                </span>
              )}
            </div>
          )}
          <InvoiceMainDataField control={control} invoice={invoice} />

          <div className="mt-4">
            <InvoiceLinesFields control={control} setValue={setValue} />
          </div>
        </div>

        <InvoiceBottomBarAction isUpdate={!!invoice} onCancel={onCancel} />
      </form>
    </InvoiceFormProvider>
  )
}

export default InvoiceForm
