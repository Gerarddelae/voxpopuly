drop policy "Delegate view voters" on "public"."voters";

drop policy "Voter can view own record" on "public"."voters";

drop policy "Admin manage candidates" on "public"."candidates";

drop policy "Authenticated view candidates" on "public"."candidates";

drop policy "Admin manage elections" on "public"."elections";

drop policy "Authenticated can view elections" on "public"."elections";

drop policy "users_view_own_profile" on "public"."profiles";

drop policy "Admin can delete voters" on "public"."voters";

drop policy "Admin can insert voters" on "public"."voters";

drop policy "Admin can update voters" on "public"."voters";

drop policy "Admin can view all voters" on "public"."voters";

drop policy "Delegates can view voters of their point" on "public"."voters";

drop policy "Voters can update own record" on "public"."voters";

drop policy "Voters can view own record" on "public"."voters";

drop policy "Admin view votes" on "public"."votes";

drop policy "Admin can delete voting points" on "public"."voting_points";

drop policy "Admin can insert voting points" on "public"."voting_points";

drop policy "Admin can update voting points" on "public"."voting_points";

drop policy "Admin view all points" on "public"."voting_points";

drop policy "Delegate view own point" on "public"."voting_points";


  create policy "Admin manage candidates"
  on "public"."candidates"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated view candidates"
  on "public"."candidates"
  as permissive
  for select
  to public
using ((( SELECT auth.role() AS role) = 'authenticated'::text));



  create policy "Admin manage elections"
  on "public"."elections"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated can view elections"
  on "public"."elections"
  as permissive
  for select
  to public
using ((( SELECT auth.role() AS role) = 'authenticated'::text));



  create policy "users_view_own_profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Admin can delete voters"
  on "public"."voters"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can insert voters"
  on "public"."voters"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can update voters"
  on "public"."voters"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can view all voters"
  on "public"."voters"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Delegates can view voters of their point"
  on "public"."voters"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.voting_points vp
  WHERE ((vp.id = voters.voting_point_id) AND (vp.delegate_id = ( SELECT auth.uid() AS uid))))));



  create policy "Voters can update own record"
  on "public"."voters"
  as permissive
  for update
  to authenticated
using ((profile_id = ( SELECT auth.uid() AS uid)))
with check ((profile_id = ( SELECT auth.uid() AS uid)));



  create policy "Voters can view own record"
  on "public"."voters"
  as permissive
  for select
  to authenticated
using ((profile_id = ( SELECT auth.uid() AS uid)));



  create policy "Admin view votes"
  on "public"."votes"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can delete voting points"
  on "public"."voting_points"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can insert voting points"
  on "public"."voting_points"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin can update voting points"
  on "public"."voting_points"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Admin view all points"
  on "public"."voting_points"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "Delegate view own point"
  on "public"."voting_points"
  as permissive
  for select
  to public
using ((delegate_id = ( SELECT auth.uid() AS uid)));



