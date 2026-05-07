import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import AppFooter from "@/components/AppFooter.vue";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function mountFooter() {
  const router = createRouter({ 
    history: createMemoryHistory(), 
    routes,
  });
  
  await router.push("/");
  await router.isReady();

  const wrapper = mount(AppFooter, {
    global: { 
      plugins: [router, i18n],
    },
    attachTo: document.body,
  });

  return { wrapper, router };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AppFooter.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountFooter>>["wrapper"];

  beforeEach(async () => {
    ({ wrapper } = await mountFooter());
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders without errors", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("footer").exists()).toBe(true);
  });

  it("renders the current year and organization name in uppercase", () => {
    const year = new Date().getFullYear().toString();
    const copyrightText = wrapper.find(".opacity-30").text();
    
    expect(copyrightText).toContain(year);
    expect(copyrightText).toContain("VIERNULVIER");
  });

  it("renders the organization title from locales", () => {
    const titles = wrapper.findAll("h4").map(h => h.text());
    expect(titles).toContain(i18n.global.t('footer.titles.organization'));
  });

  it("renders the contact information correctly", () => {
    const address = wrapper.find("address");
    expect(address.exists()).toBe(true);
    
    const emailLink = address.find('a[href^="mailto:"]');
    expect(emailLink.text()).toBe("info@viernulvier.gent");
    
    const phoneLink = address.find('a[href^="tel:"]');
    expect(phoneLink.text()).toBe(i18n.global.t('footer.contact.phone'));
  });

  it("renders the correct number of navigation links", () => {
    const navLinks = wrapper.findAll("nav .footer-link");
    expect(navLinks).toHaveLength(3);
  });

  it("renders social media links with target _blank", () => {
    const socialLinks = wrapper.findAll("a.social-link");
    expect(socialLinks.length).toBeGreaterThanOrEqual(4);
    
    const firstSocial = socialLinks[0];
    expect(firstSocial.attributes("target")).toBe("_blank");
    expect(firstSocial.attributes("rel")).toContain("noopener");
  });

  it("renders the correct city name based on locale", async () => {
    expect(wrapper.text()).toContain("9000 Gent");
    
    i18n.global.locale.value = 'en';
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain("Ghent");
  });
});
