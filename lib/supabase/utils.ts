export function cleanEnv(value: string): string {
  return value.replace(/﻿/g, "").trim()
}
