revoke execute on function public.handle_new_user() from public;
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.current_org_id() from public;
revoke execute on function public.update_updated_at_column() from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.current_org_id() to authenticated;