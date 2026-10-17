import * as React from 'react';
import { Check, MessageSquare, MoreHorizontal, Send, Trash2, UserPlus, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/controls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/misc';
import { ConfirmDialog, PageHeader } from '@/components/shared/common';
import { comments as seedComments, courses, team as seedTeam, teamActivity } from '@/lib/mock-data';
import { cn, timeAgo } from '@/lib/utils';
import { EMAIL_RE } from './auth/Login';

type Role = 'Owner' | 'Editor' | 'Reviewer';
const ROLE: Record<Role, 'default' | 'info' | 'warning'> = { Owner: 'default', Editor: 'info', Reviewer: 'warning' };

export default function Team() {
  const [members, setMembers] = React.useState(seedTeam.map(m => ({ ...m, role: m.role as Role, pending: false })));
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invite, setInvite] = React.useState({ email: '', role: 'Editor' as Role });
  const [inviteErr, setInviteErr] = React.useState('');
  const [remove, setRemove] = React.useState<string | null>(null);
  const [comments, setComments] = React.useState(seedComments);
  const [reply, setReply] = React.useState('');

  const shared = courses.slice(0, 5).map((c, i) => ({ ...c, collaborators: members.slice(0, 2 + (i % 3)) }));

  return (
    <div>
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2">Account <Badge variant="slate" className="normal-case tracking-normal">Optional for MVP</Badge></span>} title="Team & Collaboration" description="Invite co-trainers and reviewers, share courses and review together."
        actions={<Button variant="gradient" onClick={() => { setInvite({ email: '', role: 'Editor' }); setInviteErr(''); setInviteOpen(true); }}><UserPlus /> Invite member</Button>} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Members</CardTitle><CardDescription>{members.length} people at TechSummit Institute</CardDescription></div></CardHeader>
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Member</TH><TH>Role</TH><TH className="hidden md:table-cell">Courses</TH><TH className="hidden sm:table-cell">Last active</TH><TH /></TR></THead>
              <TBody>
                {members.map(m => (
                  <TR key={m.id}>
                    <TD><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className={cn(m.pending && 'bg-none bg-muted text-muted-foreground')}>{m.initials}</AvatarFallback></Avatar><div className="min-w-0"><div className="truncate font-medium">{m.name}{m.pending && <Badge variant="slate" className="ml-2">Invited</Badge>}</div><div className="truncate text-xs text-muted-foreground">{m.email}</div></div></div></TD>
                    <TD><Badge variant={ROLE[m.role]}>{m.role}</Badge></TD>
                    <TD className="hidden md:table-cell">{m.courses}</TD>
                    <TD className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">{m.pending ? '—' : timeAgo(m.lastActive)}</TD>
                    <TD>
                      {m.role !== 'Owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Manage ${m.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change role</DropdownMenuLabel>
                            {(['Editor', 'Reviewer'] as Role[]).map(r => <DropdownMenuItem key={r} onSelect={() => { setMembers(x => x.map(y => y.id === m.id ? { ...y, role: r } : y)); toast.success(`${m.name} is now ${r}`); }}>{m.role === r ? <Check /> : <span className="w-4" />}{r}</DropdownMenuItem>)}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onSelect={() => setRemove(m.id)}><Trash2 /> Remove from team</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shared courses</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {shared.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.accent[0]}, ${c.accent[1]})` }} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{c.title}</div><div className="text-xs text-muted-foreground">v{c.version} · updated {timeAgo(c.updatedAt)}</div></div>
                  <div className="flex -space-x-2">{c.collaborators.map(m => <Avatar key={m.id} className="h-7 w-7 ring-2 ring-card"><AvatarFallback className="text-[10px]">{m.initials}</AvatarFallback></Avatar>)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><CardTitle>Comments & reviews</CardTitle></div><CardDescription>{comments.filter(c => !c.resolved).length} open threads</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className={cn('rounded-xl border p-3', c.resolved && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{c.initials}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold">{c.author}</span><span className="text-xs text-muted-foreground">{timeAgo(c.at)}</span></div>
                      <div className="text-xs text-muted-foreground">{c.course} · <span className="font-medium text-foreground">{c.target}</span></div>
                      <p className="mt-1.5 text-sm">{c.text}</p>
                      <div className="mt-2 flex gap-2">
                        {c.resolved ? <Badge variant="success"><Check /> Resolved</Badge> : <Button size="sm" variant="outline" onClick={() => { setComments(x => x.map(y => y.id === c.id ? { ...y, resolved: true } : y)); toast.success('Thread resolved'); }}><Check /> Resolve</Button>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <form className="flex gap-2 pt-1" onSubmit={e => { e.preventDefault(); if (!reply.trim()) return; setComments(x => [{ id: 'c' + Date.now(), author: 'Aarav Mehta', initials: 'AM', course: 'Java OOP Fundamentals', target: 'General', text: reply.trim(), at: new Date().toISOString(), resolved: false }, ...x]); setReply(''); toast.success('Comment posted'); }}>
                <Textarea rows={1} className="min-h-[40px]" placeholder="Leave a comment for the team…" value={reply} onChange={e => setReply(e.target.value)} />
                <Button type="submit" variant="gradient" size="icon" className="h-10 w-10 shrink-0" aria-label="Post comment"><Send /></Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Activity log</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {teamActivity.map(a => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span><div className="text-xs text-muted-foreground">{timeAgo(a.at)}</div></div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Invite a team member</DialogTitle><DialogDescription>They’ll get an email to join TechSummit Institute.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <div><Label htmlFor="iemail">Email</Label><Input id="iemail" className="mt-1.5" type="email" placeholder="name@techsummit.edu" value={invite.email} onChange={e => { setInvite(i => ({ ...i, email: e.target.value })); setInviteErr(''); }} aria-invalid={!!inviteErr} />{inviteErr && <p className="mt-1.5 text-xs font-medium text-red-600">{inviteErr}</p>}</div>
            <div><Label>Role</Label><Select value={invite.role} onValueChange={v => setInvite(i => ({ ...i, role: v as Role }))}><SelectTrigger className="mt-1.5" aria-label="Role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Editor">Editor</SelectItem><SelectItem value="Reviewer">Reviewer</SelectItem></SelectContent></Select></div>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><b className="text-foreground">Editor</b> can create and edit courses. <b className="text-foreground">Reviewer</b> can comment and approve, not edit.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={() => {
              if (!EMAIL_RE.test(invite.email)) return setInviteErr('Enter a valid email address');
              if (members.some(m => m.email === invite.email)) return setInviteErr('This person is already on the team');
              const name = invite.email.split('@')[0].split(/[._-]/).map(s => s[0]?.toUpperCase() + s.slice(1)).join(' ');
              setMembers(x => [...x, { id: 'u' + Date.now(), name, email: invite.email, role: invite.role, initials: name.split(' ').map(s => s[0]).join('').slice(0, 2), lastActive: new Date().toISOString(), courses: 0, pending: true }]);
              setInviteOpen(false); toast.success('Invitation sent', { description: `${invite.email} · ${invite.role}` });
            }}><Send /> Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!remove} onOpenChange={o => !o && setRemove(null)} destructive confirmLabel="Remove" title="Remove team member?" description={`${members.find(m => m.id === remove)?.name} will lose access to all shared courses.`}
        onConfirm={() => { const m = members.find(x => x.id === remove); setMembers(x => x.filter(y => y.id !== remove)); toast.success(`${m?.name} removed`); }} />
    </div>
  );
}
