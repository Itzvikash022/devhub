"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProjectsList } from "@/hooks/useProjects";
import {
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PasswordImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  displayedLabels?: string[]; // unique labels in project view
}

interface ParsedItem {
  label: string;
  username: string;
  secret: string;
  lineNum: number;
}

export function PasswordImportExportDialog({
  open,
  onOpenChange,
  projectId,
  displayedLabels = [],
}: PasswordImportExportDialogProps) {
  const queryClient = useQueryClient();
  const isGlobalView = !projectId;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<string>("import");

  // Import State
  const [inputText, setInputText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Export State
  const { data: projects = [] } = useProjectsList();
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["ALL"]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profilePassword, setProfilePassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleOption = (val: string) => {
    if (val === "ALL") {
      setSelectedScopes(["ALL"]);
    } else {
      let next = selectedScopes.filter((o) => o !== "ALL");
      if (next.includes(val)) {
        next = next.filter((o) => o !== val);
      } else {
        next.push(val);
      }
      if (next.length === 0) {
        next = ["ALL"];
      }
      setSelectedScopes(next);
    }
  };

  const getDisplayText = () => {
    if (selectedScopes.includes("ALL")) {
      return projectId ? "Export ALL (Project level)" : "Export ALL passwords";
    }
    if (isGlobalView) {
      return selectedScopes
        .map((opt) => {
          if (opt === "unlinked") return "Non-linked";
          const proj = projects.find((p) => p._id === opt);
          return proj ? proj.name : opt;
        })
        .join(", ");
    } else {
      return selectedScopes.join(", ");
    }
  };

  // ─── Parsing Logic ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inputText.trim()) {
      setParsedItems([]);
      setParseErrors([]);
      return;
    }

    const items: ParsedItem[] = [];
    const errors: string[] = [];

    // Simple CSV parser that handles basic quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const lines = inputText.split(/\r?\n/);
    let globalItemIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let tokens = parseCSVLine(line).map((t) => t.trim());

      // Trim trailing empty tokens (e.g. from trailing comma like `label,user,pass,`)
      while (tokens.length > 0 && tokens[tokens.length - 1] === "") {
        tokens.pop();
      }

      if (tokens.length === 0) continue;

      // Skip header row if matches template headers
      const firstTokenLower = tokens[0]?.toLowerCase();
      const secondTokenLower = tokens[1]?.toLowerCase();
      const thirdTokenLower = tokens[2]?.toLowerCase();
      if (
        i === 0 &&
        (firstTokenLower === "service" ||
          firstTokenLower === "service name" ||
          firstTokenLower === "servicename") &&
        (secondTokenLower === "id" ||
          secondTokenLower === "username" ||
          secondTokenLower === "user id" ||
          secondTokenLower === "userid") &&
        (thirdTokenLower === "password" || thirdTokenLower === "pass" || thirdTokenLower === "secret")
      ) {
        continue;
      }

      // Chunk inline comma separated groups in sizes of 3
      for (let j = 0; j < tokens.length; j += 3) {
        const labelToken = tokens[j] || "";
        const usernameToken = tokens[j + 1] || "";
        const passwordToken = tokens[j + 2] || "";

        const currentItemIndex = globalItemIndex++;

        // Username and password both fields are required
        if (!usernameToken || !passwordToken) {
          let missingFields = [];
          if (!usernameToken) missingFields.push("username/ID");
          if (!passwordToken) missingFields.push("password");
          errors.push(
            `Line ${i + 1} (Item ${currentItemIndex}): Missing ${missingFields.join(" and ")}.`
          );
          continue;
        }

        items.push({
          label: labelToken.trim(), // Server fallback to "Imported X" if empty
          username: usernameToken.trim(),
          secret: passwordToken.trim(), // space trimming handled here
          lineNum: i + 1,
        });
      }
    }

    setParsedItems(items);
    setParseErrors(errors);
  }, [inputText]);

  // Handle local CSV file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  };

  // Download template CSV file
  const handleDownloadSample = () => {
    const headers = "Service Name,ID,Password\n";
    const sampleRow1 = "Github,my_username,secret_password_here\n";
    const sampleRow2 = ",another_user,plain_password_with_no_service\n";
    const csvContent =
      "data:text/csv;charset=utf-8," + encodeURIComponent(headers + sampleRow1 + sampleRow2);

    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "passwords_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample template file downloaded.");
  };

  // ─── POST Import Request ───────────────────────────────────────────────────
  const handleImport = async () => {
    if (parsedItems.length === 0) {
      toast.error("No valid entries to import.");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/passwords/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsedItems,
          projectId: projectId || null,
        }),
      });

      const json = await response.json();
      if (json.success) {
        toast.success(
          `Import complete: ${json.data.importedCount} added, ${json.data.failedCount} skipped.`
        );
        queryClient.invalidateQueries({ queryKey: ["passwords"] });
        handleResetAndClose();
      } else {
        toast.error(json.error?.message || "Import failed on server.");
      }
    } catch {
      toast.error("Network error. Import request failed.");
    } finally {
      setIsImporting(false);
    }
  };

  // ─── POST Export Request ───────────────────────────────────────────────────
  const handleExport = async () => {
    if (!profilePassword.trim()) {
      toast.error("Profile password is required to export vault.");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/passwords/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || null,
          selectedOptions: selectedScopes,
          password: profilePassword.trim(),
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error?.message || "Failed to verify password or export data.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = projectId ? "project_passwords.csv" : "global_passwords.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Passwords exported as a CSV file.");
      handleResetAndClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to export password credentials.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetAndClose = () => {
    setInputText("");
    setFileName(null);
    setSelectedScopes(["ALL"]);
    setProfilePassword("");
    setDropdownOpen(false);
    setParsedItems([]);
    setParseErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleResetAndClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import / Export Credentials</DialogTitle>
          <DialogDescription>
            Import multiple passwords via CSV or paste raw text, or export existing vault records as CSV.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="import" className="flex items-center gap-1.5 py-1">
              <Upload className="w-3.5 h-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1.5 py-1">
              <Download className="w-3.5 h-3.5" /> Export
            </TabsTrigger>
          </TabsList>

          {/* ─── IMPORT TAB ───────────────────────────────────────────────── */}
          <TabsContent value="import" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-inter text-xs text-[#6B6E64]">
                Download a clean template with the correct column structure.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="flex items-center gap-1 h-8 font-inter text-xs"
              >
                <Download className="w-3 h-3" /> Download Sample
              </Button>
            </div>

            {/* Drag & Drop style file selector */}
            <div className="border border-dashed border-[#DAD8CE] bg-[#F8F9F5] rounded-lg p-5 text-center flex flex-col items-center justify-center relative hover:bg-[#EEF0EA]/50 transition-colors">
              <FileSpreadsheet className="w-8 h-8 text-[#6B6E64] mb-2" />
              <p className="font-inter text-xs text-[#20221F] font-medium mb-1">
                {fileName ? fileName : "Upload CSV file"}
              </p>
              <p className="font-mono text-[10px] text-[#6B6E64] mb-3">
                {fileName ? "Click below to change file" : "Standard CSV structure"}
              </p>
              <label className="px-3 py-1 bg-white border border-[#DAD8CE] hover:bg-[#EEF0EA] font-inter text-xs rounded-md shadow-sm cursor-pointer transition-colors text-[#20221F]">
                Browse File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Text Paste input */}
            <div className="space-y-1.5">
              <Label htmlFor="csvPaste" className="font-mono text-[11px] uppercase tracking-widest text-[#6B6E64]">
                Or Paste Comma Separated Values (CSV text)
              </Label>
              <Textarea
                id="csvPaste"
                placeholder={`Service Name, ID, Password\nGithub, my_username, my_password\nAWS, my_aws_id, aws_password, Slack, slack_id, slack_pwd`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="h-28 font-mono text-xs resize-none"
              />
            </div>

            {/* Parser Results Preview section */}
            {inputText.trim() && (
              <div className="border border-[#DAD8CE] rounded-md overflow-hidden bg-white">
                <div className="bg-[#EEF0EA] border-b border-[#DAD8CE] px-3 py-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B6E64]">
                    Parse Preview Log
                  </span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 font-inter text-xs text-[#3F7A5C] font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> {parsedItems.length} Ready
                    </span>
                    {parseErrors.length > 0 && (
                      <span className="flex items-center gap-1 font-inter text-xs text-[#B14B4B] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> {parseErrors.length} Skipped
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-2.5 divide-y divide-[#DAD8CE]/50">
                  {/* Valid item listings */}
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5 pt-2 first:pt-0">
                      <div className="flex justify-between items-center text-[#20221F]">
                        <span className="font-semibold">
                          {item.label || "(Auto-naming on import)"}
                        </span>
                      </div>
                      <div className="text-[#6B6E64] flex gap-3">
                        <span>Username: {item.username}</span>
                        <span>Password: ••••••••</span>
                      </div>
                    </div>
                  ))}

                  {/* Invalid error lines */}
                  {parseErrors.map((err, idx) => (
                    <div key={idx} className="text-[#B14B4B] pt-2 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}

                  {parsedItems.length === 0 && parseErrors.length === 0 && (
                    <div className="text-center text-[#6B6E64] py-2">
                      No data parsed yet. Check formatting.
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={handleResetAndClose}
                className="font-inter text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                disabled={isImporting || parsedItems.length === 0}
                onClick={handleImport}
                className="bg-[#4F46C7] hover:bg-[#4338a8] text-white font-inter text-xs h-9"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  `Import ${parsedItems.length} Credentials`
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ─── EXPORT TAB ───────────────────────────────────────────────── */}
          <TabsContent value="export" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-widest text-[#6B6E64]">
                {isGlobalView ? "Select Project Filter Scope" : "Select Service Label Filter"}
              </Label>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full h-10 border border-[#DAD8CE] bg-white rounded-md px-3 font-inter text-sm text-[#20221F] focus:outline-none focus:border-[#4F46C7] flex items-center justify-between text-left"
                >
                  <span className="truncate mr-4">{getDisplayText()}</span>
                  <span className="text-[#6B6E64] text-xs">▼</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 border border-[#DAD8CE] bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* Option: ALL */}
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF0EA] cursor-pointer font-inter text-sm text-[#20221F]">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes("ALL")}
                        onChange={() => toggleOption("ALL")}
                        className="rounded border-[#DAD8CE] text-[#4F46C7] focus:ring-[#4F46C7]"
                      />
                      <span>{projectId ? "ALL (Project level)" : "ALL Passwords"}</span>
                    </label>

                    {isGlobalView ? (
                      <>
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF0EA] cursor-pointer font-inter text-sm text-[#20221F]">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes("unlinked")}
                            onChange={() => toggleOption("unlinked")}
                            className="rounded border-[#DAD8CE] text-[#4F46C7] focus:ring-[#4F46C7]"
                          />
                          <span>Non-linked (Global Vault)</span>
                        </label>
                        {projects.map((p) => (
                          <label key={p._id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF0EA] cursor-pointer font-inter text-sm text-[#20221F]">
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(p._id)}
                              onChange={() => toggleOption(p._id)}
                              className="rounded border-[#DAD8CE] text-[#4F46C7] focus:ring-[#4F46C7]"
                            />
                            <span>Project: {p.name}</span>
                          </label>
                        ))}
                      </>
                    ) : (
                      displayedLabels.map((lbl) => (
                        <label key={lbl} className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF0EA] cursor-pointer font-inter text-sm text-[#20221F]">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(lbl)}
                            onChange={() => toggleOption(lbl)}
                            className="rounded border-[#DAD8CE] text-[#4F46C7] focus:ring-[#4F46C7]"
                          />
                          <span>{lbl}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Password Confirmation */}
            <div className="space-y-1.5">
              <Label htmlFor="profilePassword" className="font-mono text-[11px] uppercase tracking-widest text-[#6B6E64]">
                Confirm Profile Password
              </Label>
              <input
                id="profilePassword"
                type="password"
                placeholder="Type profile password to secure file..."
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full h-10 border border-[#DAD8CE] bg-white rounded-md px-3 font-inter text-sm text-[#20221F] focus:outline-none focus:border-[#4F46C7]"
              />
            </div>

            <p className="font-inter text-xs text-[#6B6E64] leading-relaxed">
              Exporting will decrypt your passwords and save them in a plain text CSV file. 
              Please store this file securely and delete it after use to prevent unauthorized access.
            </p>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={handleResetAndClose}
                className="font-inter text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                disabled={isExporting}
                onClick={handleExport}
                className="bg-[#4F46C7] hover:bg-[#4338a8] text-white font-inter text-xs h-9 flex items-center gap-1.5"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" /> Download Decrypted CSV
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
