import * as React from "react";
import { ClockIcon, Loader2Icon, UserCheckIcon, UsersIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import type { AdminWaitlistItemDTO, SlotRegistrationStatsDTO } from "~/types/registration-results";
import { maskEmail } from "~/lib/mask";

interface SlotWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SlotRegistrationStatsDTO | null;
  onSelectCandidate?: (candidateId: number) => void;
}

export function SlotWaitlistDialog({
  open,
  onOpenChange,
  session,
  onSelectCandidate,
}: SlotWaitlistDialogProps) {
  const [waitlist, setWaitlist] = React.useState<AdminWaitlistItemDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);

  const fetchWaitlist = React.useCallback(async (targetPage: number) => {
    if (!session?.session_id) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/internal/admin/registration-results/sessions/${session.session_id}/waitlist?page=${targetPage}&limit=10`
      );
      if (!res.ok) throw new Error("Không thể tải danh sách chờ.");
      const json = await res.json();
      setWaitlist(json.data ?? []);
      if (json.meta) {
        setPage(json.meta.page ?? 1);
        setTotalPages(json.meta.total_pages ?? 1);
        setTotalItems(json.meta.total_items ?? 0);
      }
    } catch (err) {
      console.error(err);
      setWaitlist([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.session_id]);

  React.useEffect(() => {
    if (open && session?.session_id) {
      setPage(1);
      fetchWaitlist(1);
    }
  }, [open, session?.session_id, fetchWaitlist]);

  const formatDate = (isoString: string) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10 text-primary">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                Danh sách chờ (Waitlist Queue)
              </DialogTitle>
              <DialogDescription className="text-xs">
                {session ? (
                  <>
                    Ca thi: <strong>{session.exam_type_name}</strong> — {session.room_name} ({session.exam_date}) • Tổng số người đang đợi:{" "}
                    <strong>{totalItems}</strong>
                  </>
                ) : (
                  "Danh sách thí sinh đang xếp hàng đợi ghế trống"
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <span>Đang tải danh sách chờ...</span>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Hiện tại không có thí sinh nào trong danh sách chờ của ca thi này.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead className="w-16 text-center font-semibold">STT Hàng</TableHead>
                    <TableHead className="font-semibold">Thí sinh</TableHead>
                    <TableHead className="font-semibold">Giấy tờ & Liên hệ</TableHead>
                    <TableHead className="font-semibold">Thời điểm tham gia</TableHead>
                    <TableHead className="font-semibold text-center">Hồ sơ</TableHead>
                    <TableHead className="text-right font-semibold">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((item) => (
                    <TableRow key={item.waitlist_id} className="text-xs">
                      <TableCell className="text-center font-bold">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{item.queue_position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{item.full_name}</div>
                        <div className="text-muted-foreground text-[11px] font-mono">{maskEmail(item.email)}</div>
                        {item.is_multi_slot && (
                          <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">
                            Đã đk {item.registered_slot_count} ca khác
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{item.masked_doc_number || "—"}</div>
                        <div className="text-muted-foreground text-[11px]">{item.masked_phone || "—"}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <ClockIcon className="size-3" />
                          <span>{formatDate(item.joined_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.verification_status === "verified"
                              ? "default"
                              : item.verification_status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {item.verification_status === "verified"
                            ? "Đã duyệt"
                            : item.verification_status === "rejected"
                            ? "Bị từ chối"
                            : "Chờ duyệt"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {onSelectCandidate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full cursor-pointer hover:bg-muted text-xs h-7 px-2.5 gap-1"
                            onClick={() => onSelectCandidate(item.candidate_id)}
                          >
                            <UserCheckIcon className="size-3.5" />
                            <span>Xem hồ sơ</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pt-2 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className="rounded-full cursor-pointer text-xs h-8"
                    onClick={() => page > 1 && fetchWaitlist(page - 1)}
                    aria-disabled={page <= 1}
                  />
                </PaginationItem>
                <span className="text-xs px-2 self-center text-muted-foreground">
                  Trang {page} / {totalPages}
                </span>
                <PaginationItem>
                  <PaginationNext
                    className="rounded-full cursor-pointer text-xs h-8"
                    onClick={() => page < totalPages && fetchWaitlist(page + 1)}
                    aria-disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

