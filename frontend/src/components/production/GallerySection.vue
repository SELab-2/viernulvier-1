<template>
  <section class="bg-surface-2 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 class="text-4xl font-black uppercase tracking-tighter text-ink-primary">
            Gallery
          </h2>
          <p class="mt-2 text-sm tracking-wide text-ink-secondary">
            Visual documentation of the creative evolution from 2023–2024.
          </p>
        </div>
        <a
          href="#"
          class="border-b-2 border-ink-primary pb-1 text-[10px] font-bold uppercase tracking-widest"
        >
          View Catalog
        </a>
      </div>
      
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <div
          v-for="(img, index) in images"
          :key="index"
          class="group relative overflow-hidden bg-ink-primary"
          :class="img.className"
        >
          <img
            :alt="img.alt"
            class="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            :src="img.src"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const images = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoUqkUb0I6KcPOSisXj239nHQqPPc62CthiML0Ml9RBVfIKZEJYIsxlehz33khKkqqOqCO1YGyXQC7KPBkI6XpiBbgnJTRwkc3ub7ZOSLYInDv0SUn0nYwegh1wMPycYUxX319nl4LiqNKboMMxWnfJvHYf2HnPyTLMRPrdEXB7c6B9TeY40jtWtjbqZgE-uPSRjZKVzYbRYVgL_KdGB-YzlSiSg5fbggZBYeOe8x2wkXP2FbqOrSJTkwmXOQPqY-3882AyJ5DhF0p",
    alt: "Dance stage sketch",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBvVM2WYuziq9ZRq9DFQzHhahGLZGPSJOcmI0dG0rqKNLFrtc7scqYC6AIPf0RPnuD_MZJnEpe0L96NUtVK6A4-QbPNf5-ZZFWD4pYcSOhwBATNu4XeMRgbnkRWjzD9jWWKNd30gL6RG6f_DSMT0CkHkf2tO4RX9cCfCba2L8ekdqqcKxCxBxqOcMpXKH6SV6McWGVuvpmvM8FnqogxodboFv9M56KtICF45QsgOsR2qzAdaoySRErUkW4NnWbepTE13OTYNzUw1wd7",
    alt: "Rehearsal photo",
    className: "aspect-square",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCm-IV4I29eomSGLY4WPdxEyXqZeyFa8eQPus8fFLlpWpPNqFWykEaxZ8mCN2osbnDmxdBjCVc5PxCUZVb55mBD9LBRQYmF6S4sCDcLd2RgsEJXVh1juUvJX9rpUgkWIIYON5QIJtGE3HwurGDQC_c6hQogKZpm_1psN5p7Uo2zPQu9M1I3EjOxio2J0iOaCqZt7UfkCSXZYwRsNcnZqvaddt9ZIpd2uFgmAGgnrYT6nm_OwyKdHSsq2V8TE7uldF4abQK2bepI5GbV",
    alt: "Texture detail",
    className: "aspect-square",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAoNErxrpFHE31QLfXU6DSypuZNCe3G4Ubs50b-hr6M4oEZ666ciBM7UXynTBMLaZziFXT3X4bRyt-8cvPAKw25Zz648V0vFNgyqX7DzzCuyHUIzctH41vTwh1GZJ-1h8A-QNbBm3bYzSqYBkvpFX4qeTujlXDlTKJcyfmrwd-s_EDQCdiEUIP-Uuu6lFMvi1a0MVGU-iuYJQC3JMMGw21z4dmIrCEY7nTEUmVDDySdui2V2vzqLcaVXdiQsRuBsL0hjo2YE1dK1n-",
    alt: "Stage lighting",
    className: "md:col-span-2 h-48",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBI988GseczQoD4sAAToO2vZUIWN_a_trj-QBrzAVOOzsv5SptKZWA1l8XKHP0SxSNaKISkcOAna_uVcf7sx0VYrYlMy0kqmjA1_P4KSDeH_z1O_ApmogAwD3MDPn3wuDgk-m1J21qvHgPtnLWh7l7q9Mw821ivdU4znkvB9cizjjXALU1EyGJhRYh9p4Rz_Z-MhjQ5Zud8hqStWYkAp1mDo5JAkP7I2r1K_gcm11pFCPkwVriNZxtZ8tSBHJkqT_-AEbs1a34szshx",
    alt: "Costume fabric",
    className: "aspect-square",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAELbkcJldyjugHjgd0h1DiQBz-dMKMI1oh5JB_BU6E_QcyLxTQUYoI3XbsSrTMli814TYD-pPIrUrfrNCbNubX4H4TL-CmTg6c3iMjCJREg6drknoETRDZR53yLc2QYRMqVm70Ck68xWVmn53gdGS0RAp5Xe2x5SCtzc0L4ZdFEvcWhe3LCb3aASmliKyR9WGALoxcH0CoJT1BCK2SHaOkCOjlR4T71_j-nqBc6OiPgqpqF128DAgf8ChsJ7f8BLjPYhYUrupJ84p",
    alt: "Light setup",
    className: "aspect-square",
  },
];
</script>