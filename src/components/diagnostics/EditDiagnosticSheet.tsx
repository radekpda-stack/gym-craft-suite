import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Diagnostic, JOINT_OPTIONS, MUSCLE_OPTIONS, useUpdateDiagnostic, useDeleteDiagnostic } from "@/hooks/useDiagnostics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const editDiagnosticSchema = z.object({
  date: z.string().min(1, "Zadejte datum"),
  area_type: z.enum(["joint", "muscle"], { required_error: "Vyberte typ oblasti" }),
  area_name: z.string().min(1, "Vyberte oblast"),
  findings: z.string().min(1, "Zadejte nález").max(2000, "Max 2000 znaků"),
  notes: z.string().optional(),
});

type EditDiagnosticValues = z.infer<typeof editDiagnosticSchema>;

interface EditDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic: Diagnostic | null;
  clientName?: string;
}

export function EditDiagnosticSheet({
  open,
  onOpenChange,
  diagnostic,
  clientName,
}: EditDiagnosticSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const updateDiagnostic = useUpdateDiagnostic();
  const deleteDiagnostic = useDeleteDiagnostic();

  const form = useForm<EditDiagnosticValues>({
    resolver: zodResolver(editDiagnosticSchema),
    defaultValues: {
      date: "",
      area_type: undefined,
      area_name: "",
      findings: "",
      notes: "",
    },
  });

  // Reset form when diagnostic changes
  useEffect(() => {
    if (diagnostic) {
      form.reset({
        date: diagnostic.date,
        area_type: diagnostic.area_type as "joint" | "muscle",
        area_name: diagnostic.area_name,
        findings: diagnostic.findings,
        notes: diagnostic.notes || "",
      });
    }
  }, [diagnostic, form]);

  const areaType = form.watch("area_type");
  const areaOptions = areaType === "joint" ? JOINT_OPTIONS : areaType === "muscle" ? MUSCLE_OPTIONS : [];

  const handleSubmit = async (data: EditDiagnosticValues) => {
    if (!diagnostic) return;
    
    await updateDiagnostic.mutateAsync({
      id: diagnostic.id,
      ...data,
    });
    
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!diagnostic) return;
    
    await deleteDiagnostic.mutateAsync(diagnostic.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  if (!diagnostic) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upravit diagnostiku</SheetTitle>
            {clientName && (
              <p className="text-sm text-muted-foreground">Klient: {clientName}</p>
            )}
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Vyberte datum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ oblasti *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("area_name", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Vyberte typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="joint">Kloub</SelectItem>
                          <SelectItem value="muscle">Svalová skupina</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oblast *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!areaType}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder={areaType ? "Vyberte oblast" : "Nejdřív vyberte typ"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          {areaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="findings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nález *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Popis nálezu, omezení, doporučení..."
                        className="bg-secondary border-border min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Další poznámky..."
                        className="bg-secondary border-border min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button type="submit" className="flex-1" disabled={updateDiagnostic.isPending}>
                  {updateDiagnostic.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    "Uložit změny"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat diagnostiku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Diagnostika bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDiagnostic.isPending ? "Mažu..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
