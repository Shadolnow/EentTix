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
import { Download, CheckCircle, Clock, MoreHorizontal, Ban, Banknote, AlertCircle, Trash2 } from 'lucide-react';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

      const headers = ['Name', 'Email', 'Phone', 'Ticket Code', 'Payment Status', 'Validated', 'Created At'];
      const rows = data.tickets.map((ticket: any) => [
        ticket.attendee_name,
        ticket.attendee_email,
        ticket.attendee_phone || 'N/A',
        ticket.ticket_code,
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

  const updateTicketStatus = async (ticketId: string, status: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: status })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success(`Ticket marked as ${status}`);
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      toast.error('Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (ticket: any) => {
    if (ticket.payment_status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (ticket.payment_status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (ticket.payment_status === 'pending' || ticket.payment_status === 'pay_at_venue') {
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pending Payment</Badge>;
    }
    if (ticket.payment_status === 'paid' || !ticket.payment_status) {
      // Check validation
      if (ticket.is_validated) {
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Validated</Badge>;
      }
      return <Badge variant="secondary" className="text-green-500 bg-green-500/10">Paid</Badge>;
    }
    return <Badge variant="outline">{ticket.payment_status}</Badge>;
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendee List</CardTitle>
            <CardDescription>Manage attendees and verify payments</CardDescription>
          </div>
          <Button variant="outline" onClick={downloadCSV} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </Button>
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
                          <Button variant="ghost" className="h-8 w-8 p-0">
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

                          {/* Payment Actions */}
                          {(ticket.payment_status === 'pending' || ticket.payment_status === 'pay_at_venue') && (
                            <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, 'paid')}>
                              <Banknote className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}

                          {/* Cancellation Actions */}
                          {(ticket.payment_status !== 'cancelled' && ticket.payment_status !== 'expired' && !ticket.is_validated) && (
                            <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, 'cancelled')} className="text-orange-500">
                              <Ban className="mr-2 h-4 w-4" />
                              Revoke / Cancel
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
