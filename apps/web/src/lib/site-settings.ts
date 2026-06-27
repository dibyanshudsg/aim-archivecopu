export interface SiteSettings {
  feedback_form_url: string;
  feedback_form_edit_url: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  feedback_form_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/viewform',
  feedback_form_edit_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/edit',
};
