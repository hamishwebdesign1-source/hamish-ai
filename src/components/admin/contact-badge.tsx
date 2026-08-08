import { MessageCircleReply, PhoneCall, Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLeadCadenceAction } from "@/lib/lead-status";
import { timeAgo } from "@/lib/time-ago";

type LeadRow = {
  status: string;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  pending_email_message_id: string | null;
};

// The single badge that tells Hamish, at a glance, exactly where a lead
// sits in the email → wait → call cadence — replied, due a call, due a
// follow-up, or just a quiet "here's the last touch" note. Shared between
// the leads list and the lead detail page.
export function ContactBadge({ lead }: { lead: LeadRow }) {
  if (lead.replied_at) {
    return (
      <Badge variant="success" className="gap-1">
        <MessageCircleReply className="size-3" />
        Replied {timeAgo(lead.replied_at)}
      </Badge>
    );
  }

  const action = getLeadCadenceAction(lead);
  if (action === "call") {
    return (
      <Badge variant="warning" className="gap-1">
        <PhoneCall className="size-3" />
        Call now
      </Badge>
    );
  }
  if (action === "follow_up") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="size-3" />
        Needs follow-up
      </Badge>
    );
  }
  if (lead.status === "contacted" && lead.contacted_at) {
    const wasCall = lead.last_contact_method === "call";
    return (
      <Badge variant="secondary" className="gap-1">
        {wasCall ? <PhoneCall className="size-3" /> : <Mail className="size-3" />}
        {wasCall ? "Called" : "Emailed"} {timeAgo(lead.contacted_at)}
      </Badge>
    );
  }
  if (lead.pending_email_message_id) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Mail className="size-3" />
        Draft pending — not sent yet
      </Badge>
    );
  }
  return null;
}
