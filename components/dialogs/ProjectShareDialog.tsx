import { useState } from "react";
import { useInviteUser } from "@/hooks/useInvitations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Users } from "lucide-react";
import { toast } from "sonner";

interface ProjectShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ProjectShareDialog({ open, onOpenChange, projectId }: ProjectShareDialogProps) {
  const [email, setEmail] = useState("");
  const { mutate: inviteUser, isPending } = useInviteUser();

  const handleShare = () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    inviteUser(
      { projectId, email: email.trim() },
      {
        onSuccess: () => {
          toast.success("Invitation sent successfully");
          setEmail("");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Invite a team member to collaborate on this project. They will receive an invitation in their dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-foreground text-sm font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleShare();
                  }
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Shared users will have full editor access to this workspace.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isPending || !email.trim()}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
