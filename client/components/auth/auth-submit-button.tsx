"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type AuthSubmitButtonProps = {
  children: React.ReactNode
  pendingText: string
}

export function AuthSubmitButton({
  children,
  pendingText,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="h-10 w-full" disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  )
}
