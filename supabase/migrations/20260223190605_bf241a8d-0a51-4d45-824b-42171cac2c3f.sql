
-- Add permissive anonymous read access to all tables
CREATE POLICY "anon_read_app_settings" ON public.app_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_brands" ON public.brands FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_chat_feedback" ON public.chat_feedback FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_chat_logs" ON public.chat_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_chat_messages" ON public.chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_chats" ON public.chats FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_drive_files" ON public.drive_files FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_employees" ON public.employees FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_file_content" ON public.file_content FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_knowledge_entries" ON public.knowledge_entries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_product_ingredients" ON public.product_ingredients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_state_allowed_products" ON public.state_allowed_products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_state_excise_taxes" ON public.state_excise_taxes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_state_notes" ON public.state_notes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_states" ON public.states FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_user_filter_preferences" ON public.user_filter_preferences FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_user_roles" ON public.user_roles FOR SELECT TO anon USING (true);
