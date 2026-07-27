"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/** Segmented, one-box-per-digit OTP input. Digit count is driven by the portal. */
export function OtpInput({
  id,
  length,
  value,
  onChange,
  onComplete,
  autoFocus,
  disabled,
}: {
  id?: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      id={id}
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      pattern={REGEXP_ONLY_DIGITS}
      autoFocus={autoFocus}
      disabled={disabled}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        {Array.from({ length }, (_, index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
