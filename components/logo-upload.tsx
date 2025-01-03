import { useState, ChangeEvent } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LogoUploadProps {
  onLogoChange: (logo: string) => void
}

export function LogoUpload({ onLogoChange }: LogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreviewUrl(result)
        onLogoChange(result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-4">
      <Input type="file" accept="image/*" onChange={handleFileChange} />
      {previewUrl && (
        <div className="mt-4">
          <img src={previewUrl} alt="Logo preview" className="max-w-xs max-h-20 object-contain" />
        </div>
      )}
    </div>
  )
}

