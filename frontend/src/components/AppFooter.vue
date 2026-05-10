<template>
  <footer class="bg-surface-inv text-ink-on-inv px-6 py-12 border-t border-surface-inv-border">
    <div class="mx-auto max-w-[1400px]">
      
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
        
        <div class="flex flex-col gap-3">
          <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-ink-on-inv">
            {{ $t('footer.titles.organization') }}
          </h4>
          <div class="text-[8px] uppercase tracking-[0.15em] text-ink-on-inv-secondary leading-relaxed">
            <p class="font-bold text-ink-on-inv">Kunstencentrum VIERNULVIER vzw</p>
            <p class="opacity-70">BTW BE 0423.063.619</p>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-ink-on-inv">
            {{ $t('footer.titles.contact') }}
          </h4>
          <address class="not-italic text-[8px] uppercase tracking-[0.15em] text-ink-on-inv-secondary space-y-1 flex flex-col">
            <span class="opacity-70">Sint-Pietersnieuwstraat 23</span>
            <span class="opacity-70">{{ $t('footer.address.city') }}, {{ $t('footer.address.country') }}</span>
            <a href="tel:+3292672820" class="hover:text-white transition-colors mt-1">
              {{ $t('footer.contact.phone') }}
            </a>
            <a href="mailto:info@viernulvier.gent" class="hover:text-white transition-colors">info@viernulvier.gent</a>
          </address>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-ink-on-inv">
            {{ $t('footer.titles.navigation') }}
          </h4>
          <nav class="flex flex-col space-y-1.5 text-[8px] uppercase tracking-[0.2em] font-bold">
            <router-link to="/" class="footer-link">{{ $t('footer.nav.home') }}</router-link>
            <router-link to="/productions" class="footer-link">{{ $t('footer.nav.productions') }}</router-link>
            <router-link to="/blog" class="footer-link">{{ $t('footer.nav.blog') }}</router-link>
          </nav>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-ink-on-inv">
            {{ $t('footer.titles.connect') }}
          </h4>
          <div class="flex flex-wrap gap-5 items-center">
            <a href="https://www.instagram.com/viernulvier.gent/" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.tiktok.com/@viernulvier.gent" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="TikTok">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a8.6 8.6 0 01-1.87-1.42v5.14c0 3.01-.44 5.85-2.64 7.82-2.13 1.92-5.23 2.51-7.89 1.74-3.41-1.01-5.69-4.57-5.18-8.06.39-2.71 2.37-5.22 5.03-5.91 1.32-.34 2.75-.33 4.07.03V11.23c-1.31-.41-2.8-.29-3.93.53-1.42.98-1.93 3.12-1.04 4.58.9 1.48 2.81 1.95 4.31 1.14 1.05-.57 1.59-1.83 1.61-2.99.03-3.23.01-6.46.02-9.69.01-.01.01-.01.03-.03z" /></svg>
            </a>
            <a href="https://www.facebook.com/VIERNULVIER.gent/" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Facebook">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://www.linkedin.com/company/viernulviergent" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="https://www.youtube.com/channel/UCdRYlqUQcIm6pbLgHHobQcQ" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="YouTube">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>
            </a>
          </div>
          <div class="mt-4 text-[7px] opacity-30 uppercase tracking-widest">
            &copy; 2026 VIERNULVIER
          </div>
        </div>

      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
useI18n();
</script>

<style scoped>
@reference "@/style.css";

.footer-link {
  @apply text-ink-on-inv-secondary transition-colors duration-200 hover:text-white;
}

.router-link-active {
  @apply text-white;
}

.social-link {
  @apply text-ink-on-inv-tertiary transition-all duration-300 hover:text-white hover:scale-110;
}

svg {
  @apply opacity-70;
}

.social-link:hover svg {
  @apply opacity-100;
}
</style>