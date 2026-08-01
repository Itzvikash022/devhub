"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDecryptImage } from "@/hooks/useImages";
import { Loader2, Key } from "lucide-react";

interface ImageDecryptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  imageId: string;
  onDecrypted: (base64Data: string) => void;
}

export function ImageDecryptDialog({
  open,
  onOpenChange,
  projectId,
  imageId,
  onDecrypted,
}: ImageDecryptDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { mutate: decryptImage, isPending } = useDecryptImage(projectId, imageId);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPassphrase("");
      setErrorMsg("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      setErrorMsg("Passphrase is required.");
      return;
    }

    decryptImage(passphrase, {
      onSuccess: (res) => {
        onDecrypted(res.decryptedData);
        onOpenChange(false);
      },
      onError: (err) => {
        setErrorMsg(err.message || "Failed to decrypt. Check your passphrase.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="text-primary h-5 w-5" />
              Decrypt Image
            </DialogTitle>
            <DialogDescription>
              This image is encrypted. Please enter the passphrase used to upload it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Field data-invalid={!!errorMsg}>
              <FieldLabel htmlFor="passphrase">Decryption Passphrase</FieldLabel>
              <Input
                id="passphrase"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              {errorMsg && <FieldError>{errorMsg}</FieldError>}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !passphrase}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Decrypting...
                </>
              ) : (
                "Unlock Preview"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
