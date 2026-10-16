create table public.wengu_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint payload_object check (jsonb_typeof(payload) = 'object')
);
alter table public.wengu_progress enable row level security;
revoke all on public.wengu_progress from public, anon;
grant select, insert, update on public.wengu_progress to authenticated;
create policy "Users access only their own progress"
on public.wengu_progress for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create function public.wengu_sync_progress(
  p_user_id uuid,
  p_payload jsonb,
  p_expected_revision bigint
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved public.wengu_progress%rowtype;
begin
  if current_user_id is null or p_user_id is distinct from current_user_id then
    raise exception 'This session cannot synchronize another account.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0
     or jsonb_typeof(p_payload) is distinct from 'object'
     or p_payload->>'version' is distinct from '1'
     or jsonb_typeof(p_payload->'learning') is distinct from 'object'
     or jsonb_typeof(p_payload->'mistakes') is distinct from 'object'
     or jsonb_typeof(p_payload->'history') is distinct from 'array'
     or jsonb_typeof(p_payload->'settings') is distinct from 'object'
     or octet_length(p_payload::text) > 4000000 then
    raise exception 'Invalid study progress payload.' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.wengu_progress(user_id, payload, revision)
    values (current_user_id, p_payload, 1)
    on conflict (user_id) do nothing
    returning * into saved;
  else
    update public.wengu_progress
    set payload = p_payload, revision = revision + 1, updated_at = now()
    where user_id = current_user_id and revision = p_expected_revision
    returning * into saved;
  end if;
  if found then
    return jsonb_build_object('applied', true, 'payload', saved.payload, 'revision', saved.revision);
  end if;
  select * into saved from public.wengu_progress where user_id = current_user_id;
  return jsonb_build_object('applied', false, 'payload', saved.payload, 'revision', coalesce(saved.revision, 0));
end;
$$;
revoke all on function public.wengu_sync_progress(uuid,jsonb,bigint) from public, anon;
grant execute on function public.wengu_sync_progress(uuid,jsonb,bigint) to authenticated;
