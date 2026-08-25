import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth/auth.interceptor';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './auth/change-password/change-password.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { AccountMenuComponent } from './auth/account-menu/account-menu.component';
import { EmailConfirmedComponent } from './auth/email-confirmed/email-confirmed.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent, ImageDialog } from './app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MaterialsModule } from './materials/materials.module';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { PartnershipComponent } from './partnership/partnership.component';
import { OutputsComponent } from './outputs/outputs.component';
import { ReferencesComponent } from './references/references.component';
import { PartnerComponent } from './partner/partner.component';
import { ResourcesComponent } from './resources/resources.component';
import { SafeHtmlPipe } from '../pipehtml';
import { NewsComponent } from './news/news.component';
import { NewComponent } from './new/new.component';
import { NewsFrontComponent } from './news-front/news-front.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FooterComponent } from './footer/footer.component';
import { FrontPartnersComponent } from './front-partners/front-partners.component';
import { SocialsMenuComponent } from './socials-menu/socials-menu.component';
import { TranslateService } from './translate/translate.service';
import { TranslateComponent } from './translate/translate.component';
import { NewslettersComponent } from './newsletters/newsletters.component';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NewslettersFrontComponent } from './newsletters-front/newsletters-front.component';
import { TranslatePipe } from './translate/translate.pipe';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEe from '@angular/common/locales/ee';
import localeGr from '@angular/common/locales/el';
import localeNo from '@angular/common/locales/no';
import localePl from '@angular/common/locales/pl';
import localeUa from '@angular/common/locales/ru-UA';
import { EscapeRoomComponent } from './escape-room/escape-room.component';
import { FormsModule } from '@angular/forms';
import { EscapeRoomsComponent } from './escape-rooms/escape-rooms.component';
import { ArticlesComponent } from './articles/articles.component';
import { ArticleComponent } from './article/article.component';
import { LeafletsComponent } from './leaflets/leaflets.component';
import { EmpathySkill22Component } from './empathy-skill22/empathy-skill22.component';
import { StrategicThinkingSkill16Component } from './strategic-thinking-skill16/strategic-thinking-skill16.component';
import { OpenMindnessSkillSkill26Component } from './open-mindness-skill-skill26/open-mindness-skill-skill26.component';
import { FinancialSkill10BComponent } from './financial-skill10-b/financial-skill10-b.component';
import { StressManagementSkill17Component } from './stress-management-skill17/stress-management-skill17.component';
import { TrustBuildingSkill18Component } from './trust-building-skill18/trust-building-skill18.component';
import { ActiveListeningSkill19Component } from './active-listening-skill19/active-listening-skill19.component';
import { AdaptabilitySkill20Component } from './adaptability-skill20/adaptability-skill20.component';
import { FlexibilitySkill23Component } from './flexibility-skill23/flexibility-skill23.component';
import { InterpersonalSkillsSkill24Component } from './interpersonal-skills-skill24/interpersonal-skills-skill24.component';
import { LanguageSkillsSkill25Component } from './language-skills-skill25/language-skills-skill25.component';
import { MarketAwarenessSkill21Component } from './market-awareness-skill21/market-awareness-skill21.component';
import { LegalComplianceSkill20Component } from './legal-compliance-skill20/legal-compliance-skill20.component';
import { SelfRelianceSkill28Component } from './self-reliance-skill28/self-reliance-skill28.component';
import { TeamworkSkill29Component } from './teamwork-skill29/teamwork-skill29.component';
import { ResilienceSkill27Component } from './resilience-skill27/resilience-skill27.component';
import { MotivatingOthersComponent } from './motivating-others/motivating-others.component';
import { ToleranceSkill30Component } from './tolerance-skill30/tolerance-skill30.component';
import { LeadershipSkill19Component } from './leadership-skill19/leadership-skill19.component';
import { DecisionMakingModule4Component } from './decision-making-module4/decision-making-module4.component';
import { CrmModule3Component } from './crm-module3/crm-module3.component';
import { BusinessPlanningModule1Component } from './business-planning-module1/business-planning-module1.component';
import { CriticalThinkingModule2Component } from './critical-thinking-module2/critical-thinking-module2.component';
import { DigitalSkillsModule5Component } from './digital-skills-module5/digital-skills-module5.component';
import { NegotiationSkillsModule11Component } from './negotiation-skills-module11/negotiation-skills-module11.component';
import { NetworkingSkillsModule12Component } from './networking-skills-module12/networking-skills-module12.component';
import { RiskManagementModule15Component } from './risk-management-module15/risk-management-module15.component';
import { ProblemSolvingModule13Component } from './problem-solving-module13/problem-solving-module13.component';
import { ProjectManagementModule14Component } from './project-management-module14/project-management-module14.component';
import { LearningIntroComponent } from './learning/learning-intro/learning-intro.component';
import { LearningFlowComponent } from './learning/learning-flow/learning-flow.component';
import { ModulesLibraryComponent } from './learning/modules-library/modules-library.component';
import { YourModulesComponent } from './learning/your-modules/your-modules.component';
import { QuestionnaireComponent } from './learning/questionnaire/questionnaire.component';
import { DashboardComponent } from './learning/dashboard/dashboard.component';
import { LearningLayoutComponent } from './learning/learning-layout/learning-layout.component';
import { FlipbookComponent } from './learning/flipbook/flipbook.component';

export function setupTranslateFactory(
  service: TranslateService): Function {
  let userLang = navigator.language;
  let langValue = 'en';

  // if (userLang === 'el-GR') {
  //   langValue = 'gr';
  // }

  registerLocaleData(localeEn, 'en');
  registerLocaleData(localeEe, 'ee');
  registerLocaleData(localeGr, 'gr');
  registerLocaleData(localeNo, 'no');
  registerLocaleData(localePl, 'pl');
  registerLocaleData(localeUa, 'ua');

  return () => service.use(langValue);
}

@NgModule({
  declarations: [
    AppComponent,
    TranslateComponent,
    HomeComponent,
    AboutComponent,
    PartnershipComponent,
    OutputsComponent,
    ReferencesComponent,
    PartnerComponent,
    ResourcesComponent,
    SafeHtmlPipe,
    NewsComponent,
    NewComponent,
    NewsFrontComponent,
    FooterComponent,
    FrontPartnersComponent,
    SocialsMenuComponent,
    NewslettersComponent,
    ImageDialog,
    NewslettersFrontComponent,

    EscapeRoomsComponent,
    ArticlesComponent,
    ArticleComponent,
    LeafletsComponent,

    LearningIntroComponent,
    LearningFlowComponent,
    ModulesLibraryComponent,
    YourModulesComponent,
    QuestionnaireComponent,
    DashboardComponent,
    LearningLayoutComponent,
    FlipbookComponent,

    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ChangePasswordComponent,
    ProfileComponent,
    AccountMenuComponent,
    EmailConfirmedComponent,
    ResetPasswordComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    MaterialsModule,
    FlexLayoutModule,
    TranslatePipe,
    EscapeRoomComponent,
    EmpathySkill22Component,
    StrategicThinkingSkill16Component,
    OpenMindnessSkillSkill26Component,
    FinancialSkill10BComponent,
    StressManagementSkill17Component,
    TrustBuildingSkill18Component,
    ActiveListeningSkill19Component,
    AdaptabilitySkill20Component,
    FlexibilitySkill23Component,
    InterpersonalSkillsSkill24Component,
    LanguageSkillsSkill25Component,
    MarketAwarenessSkill21Component,
    LegalComplianceSkill20Component,
    SelfRelianceSkill28Component,
    TeamworkSkill29Component,
    MotivatingOthersComponent,
    ResilienceSkill27Component,
    ToleranceSkill30Component,
    LeadershipSkill19Component,
    DecisionMakingModule4Component,
    CrmModule3Component,
    BusinessPlanningModule1Component,
    CriticalThinkingModule2Component,
    DigitalSkillsModule5Component,
    NegotiationSkillsModule11Component,
    NetworkingSkillsModule12Component,
    RiskManagementModule15Component,
    ProblemSolvingModule13Component,
    ProjectManagementModule14Component,
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // provideAnimations(),
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
