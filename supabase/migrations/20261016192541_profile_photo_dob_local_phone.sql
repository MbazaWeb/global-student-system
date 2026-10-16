alter table public.student_profiles
 add column date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
 add column avatar_path text check (avatar_path is null or avatar_path like id::text || '/%');
alter table public.student_profiles drop constraint if exists gss_student_phone_format;
alter table public.student_profiles add constraint gss_student_phone_format check(phone is null or phone ~ '^[+]?[0-9]{7,15}$');
grant update(date_of_birth,avatar_path) on public.student_profiles to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-avatars','student-avatars',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy "student reads own avatar" on storage.objects for select to authenticated
 using(bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "student uploads own avatar" on storage.objects for insert to authenticated
 with check(bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "student removes own avatar" on storage.objects for delete to authenticated
 using(bucket_id='student-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
