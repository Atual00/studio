
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext, 
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const formMethods = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }
  const { id } = itemContext

  // Ensure formMethods is available (it should be, if FormProvider is used)
  if (!formMethods) {
    throw new Error("useFormContext returned null or undefined. Ensure FormField is used within a FormProvider.")
  }
  
  const { getFieldState, formState } = formMethods;

  // Check if getFieldState is actually a function
  if (typeof getFieldState !== 'function') {
    console.error("useFormContext did not return an object with getFieldState function.", formMethods);
    // It's better to throw an error here or return a default state if absolutely necessary,
    // rather than proceeding with a non-functional getFieldState.
    // For now, this will likely lead to a runtime error if getFieldState is not a function.
    // Consider adding more robust error handling or default state if this becomes an issue.
    throw new Error("getFieldState is not a function. Check react-hook-form version or context provider setup.");
  }
  
  const fieldState = getFieldState(fieldContext.name, formState)


  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ children, ...restProps }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  // Attempt to ensure 'children' is a single valid React element for Slot.
  let singleValidChild = children;
  if (Array.isArray(children)) {
    // Filter out non-element children (like whitespace text nodes)
    const validElements = React.Children.toArray(children).filter(
      (child): child is React.ReactElement => React.isValidElement(child)
    );
    if (validElements.length === 1) {
      singleValidChild = validElements[0];
    } else if (validElements.length === 0) {
      singleValidChild = null; // No valid child to pass to Slot
    }
    // If validElements.length > 1, Slot will likely throw an error, which is correct.
    // We pass 'validElements' in this case, so Slot can handle it.
    else {
        singleValidChild = validElements as any; 
    }
  } else if (children !== null && children !== undefined && !React.isValidElement(children)) {
    // If children is a string, number, or boolean, Slot will error. Set to null.
    singleValidChild = null;
  }


  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...restProps}
    >
      {singleValidChild}
    </Slot>
  );
});
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
