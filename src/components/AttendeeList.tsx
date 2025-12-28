import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, CheckCircle, Clock, MoreHorizontal, Ban, Banknote, AlertCircle, Trash2, Printer } from 'lucide-react';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/safeClient';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface AttendeeListProps {
  tickets: any[];
  eventTitle: string;
  eventId: string;
}

export const AttendeeList = ({ tickets, eventTitle, eventId }: AttendeeListProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const deleteTicket = async (ticketId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this ticket? This cannot be undone.")) {
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket deleted successfully');
    } catch (err: any) {
      console.error('Error deleting ticket:', err);
      toast.error('Failed to delete ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadCSV = async () => {
    if (tickets.length === 0) {
      toast.error('No attendees to download');
      return;
    }

    setIsExporting(true);

    try {
      const { data: authData } = await supabase.auth.getSession();

      if (!authData.session) {
        toast.error('You must be signed in to export data');
        setIsExporting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('export-attendees', {
        body: { eventId, eventTitle },
      });

      if (error) {
        console.error('Export error:', error);
        toast.error('Failed to export attendee list');
        setIsExporting(false);
        return;
      }

      if (!data?.tickets) {
        toast.error('No data received');
        setIsExporting(false);
        return;
      }

      const headers = ['Name', 'Email', 'Phone', 'Ticket Code', 'Tier', 'Payment Status', 'Validated', 'Created At'];
      const rows = data.tickets.map((ticket: any) => [
        ticket.attendee_name,
        ticket.attendee_email,
        ticket.attendee_phone || 'N/A',
        ticket.ticket_code,
        ticket.tier_name || 'Standard',
        ticket.payment_status || 'paid',
        ticket.is_validated ? 'Yes' : 'No',
        format(new Date(ticket.created_at), 'PPpp')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${eventTitle.replace(/\s+/g, '_')}_attendees_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBackupPDF = () => {
    if (tickets.length === 0) {
      toast.error('No attendees to generate backup list');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download the backup list');
      return;
    }

    const today = format(new Date(), 'PPpp');

    // Sort tickets by name for the gate list
    const sortedTickets = [...tickets].sort((a, b) => a.attendee_name.localeCompare(b.attendee_name));

    const html = `
      <html>
        <head>
          <title>Gate Backup List - ${eventTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            h1 { margin: 0; font-size: 24px; color: #000; }
            .event-info { margin-top: 10px; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f4f4f4; text-align: left; padding: 12px; border: 1px solid #ddd; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
            .tier-badge { font-weight: bold; color: #e67e22; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            .sign-box { width: 80px; height: 30px; border: 1px solid #ccc; }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GATE BACKUP CHECK-IN LIST</h1>
            <div class="event-info">
              <strong>Event:</strong> ${eventTitle} | <strong>Generated:</strong> ${today}<br>
              Total Attendees: ${tickets.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 20%">Attendee Name</th>
                <th style="width: 25%">Contact Info</th>
                <th style="width: 15%">Ticket Code</th>
                <th style="width: 15%">Tier Type</th>
                <th style="width: 10%">Status</th>
                <th style="width: 10%">Sign-in</th>
              </tr>
            </thead>
            <tbody>
              ${sortedTickets.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${t.attendee_name}</strong></td>
                  <td>${t.attendee_email}<br><small>${t.attendee_phone || '-'}</small></td>
                  <td style="font-family: monospace;">${t.ticket_code}</td>
                  <td class="tier-badge">${t.tier_name || 'Standard'}</td>
                  <td>${t.payment_status === 'paid' ? 'PAID' : 'PENDING'}</td>
                  <td><div class="sign-box"></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated by TicketPro Event Management System | Confidential Gate Document
          </div>
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close after print
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const updateTicketValidation = async (ticketId: string, isValidated: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          is_validated: isValidated,
          validated_at: isValidated ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success(isValidated ? 'Ticket validated' : 'Ticket invalidated');
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      toast.error('Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (ticket: any) => {
    if (ticket.is_validated) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">Validated</Badge>;
    }
    return <Badge variant="secondary">Not Validated</Badge>;
  };

  return (
    <Card className="glass-card-hover border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendee List</CardTitle>
            <CardDescription>Manage attendees and verify payments</CardDescription>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" onClick={downloadBackupPDF} className="btn-flex h-9 text-xs">
              <Printer className="w-4 h-4 mr-2" />
              Backup PDF
            </Button>
            <Button variant="outline" onClick={downloadCSV} disabled={isExporting} className="btn-flex h-9 text-xs">
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No attendees yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Ticket Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.attendee_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{ticket.attendee_email}</div>
                      <div className="text-xs text-muted-foreground">{ticket.attendee_phone || '-'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ticket.ticket_code}</TableCell>
                    <TableCell>
                      {getStatusBadge(ticket)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0 touch-target-min">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ticket.ticket_code)}>
                            Copy Ticket Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          {/* Validation Actions */}
                          {!ticket.is_validated && (
                            <DropdownMenuItem onClick={() => updateTicketValidation(ticket.id, true)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Validated
                            </DropdownMenuItem>
                          )}

                          {ticket.is_validated && (
                            <DropdownMenuItem onClick={() => updateTicketValidation(ticket.id, false)} className="text-orange-500">
                              <Ban className="mr-2 h-4 w-4" />
                              Invalidate Ticket
                            </DropdownMenuItem>
                          )}

                          {/* Delete Action (Hard Delete) */}
                          <DropdownMenuItem onClick={() => deleteTicket(ticket.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
