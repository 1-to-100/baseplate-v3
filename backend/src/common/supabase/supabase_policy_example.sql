-- Відкликаємо абсолютно всі права (SELECT, INSERT, UPDATE, DELETE, etc.)
-- на таблицю _prisma_migrations у ролей anon і authenticated.
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;

-- проблеми з включення RLS articles, тому поки прибрав всі права
REVOKE ALL ON TABLE public.articles FROM anon, authenticated;


ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

create policy "disable_access_to_api_logs"
on "public"."api_logs"
    as PERMISSIVE
    for ALL
    to public
    using (false) with check (false);

ALTER TABLE public.user_one_time_codes ENABLE ROW LEVEL SECURITY;
create policy "disable_read_access_for_all_users"
    on "public"."user_one_time_codes"
    as PERMISSIVE
    for ALL
    to public
    using (false)
    with check (false);


ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
create policy "disable_read_access_managers_for_all_users"
    on "public"."managers"
    as PERMISSIVE
    for ALL
    to public
    using (false)
    with check (false);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
create policy "enable_read_access_subscriptions_for_all_users"
    on "public"."subscriptions"
    as PERMISSIVE
    for SELECT
    to public
    using (true);

-- не виконалась
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
create policy "enable_read_access_articles_for_all_users"
    on "public"."articles"
    as PERMISSIVE
    for SELECT
    to public
    using (true);

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
create policy "enable_read_access_article_categories_for_all_users"
    on "public"."article_categories"
    as PERMISSIVE
    for SELECT
    to public
    using (true);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
create policy "enable_read_access_permissions_for_all_users"
    on "public"."permissions"
    as PERMISSIVE
    for SELECT
    to public
    using (true);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
create policy "disable_access_role_permissions_for_all_users"
    on "public"."role_permissions"
    as PERMISSIVE
    for ALL
    to public
    using (true) with check (false);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
create policy "enable_read_access_roles_for_all_users"
    on "public"."roles"
    as PERMISSIVE
    for SELECT
    to public
    using (true);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
create policy "disable_access_notification_templates_for_all_users"
    on "public"."notification_templates"
    as PERMISSIVE
    for ALL
    to public
    using (false) with check (false);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
create policy "disable_access_notifications_for_all_users"
    on "public"."notifications"
    as PERMISSIVE
    for ALL
    to public
    using (false) with check (false);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
create policy "disable_access_customers_for_all_users"
    on "public"."customers"
    as PERMISSIVE
    for ALL
    to public
    using (false) with check (false);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
create policy "disable_access_users_for_all_users"
    on "public"."users"
    as PERMISSIVE
    for ALL
    to public
    using (false) with check (false);






