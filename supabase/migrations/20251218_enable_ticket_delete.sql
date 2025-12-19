-- Allow event owners to DELETE tickets for their own events
CREATE POLICY "Users can delete tickets for their events"
  ON public.tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
  );
