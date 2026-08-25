import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { HomeComponent } from './home/home.component';
import { PartnershipComponent } from './partnership/partnership.component';
import { PartnerComponent } from './partner/partner.component';
import { OutputsComponent } from './outputs/outputs.component';
import { ResourcesComponent } from './resources/resources.component';
import { NewsComponent } from './news/news.component';
import { NewComponent } from './new/new.component';
import { NewslettersComponent } from './newsletters/newsletters.component';
import { EscapeRoomComponent } from './escape-room/escape-room.component';
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
import { ResilienceSkill27Component } from './resilience-skill27/resilience-skill27.component';
import { TeamworkSkill29Component } from './teamwork-skill29/teamwork-skill29.component';
import { ToleranceSkill30Component } from './tolerance-skill30/tolerance-skill30.component';
import { MotivatingOthersComponent } from './motivating-others/motivating-others.component';
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

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ChangePasswordComponent } from './auth/change-password/change-password.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { EmailConfirmedComponent } from './auth/email-confirmed/email-confirmed.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { authGuard } from './auth/auth.guard';

const routes: Routes = [
  { path: '', component: HomeComponent, data: { animation: 'home' } },
  { path: 'login', component: LoginComponent, data: { animation: 'login' } },
  { path: 'register', component: RegisterComponent, data: { animation: 'register' } },
  { path: 'forgot-password', component: ForgotPasswordComponent, data: { animation: 'forgotPassword' } },
  { path: 'auth/confirmed', component: EmailConfirmedComponent, data: { animation: 'emailConfirmed' } },
  { path: 'auth/reset-password', component: ResetPasswordComponent, data: { animation: 'resetPassword' } },
  { path: 'account/profile', component: ProfileComponent, canActivate: [authGuard], data: { animation: 'profile' } },
  { path: 'account/change-password', component: ChangePasswordComponent, canActivate: [authGuard], data: { animation: 'changePassword' } },
  { path: 'home', component: HomeComponent, data: { animation: 'home' } },
  { path: 'about', component: AboutComponent, data: { animation: 'about' } },
  // { path: 'biblio/:id', component: BiblioItemComponent, data: { animation: 'biblioItem' } },
  { path: 'news', component: NewsComponent, data: { animation: 'news' } },
  { path: 'newsletters', component: NewslettersComponent, data: { animation: 'newsletters' } },
  { path: 'new/:id', component: NewComponent, data: { animation: 'new' } },
  { path: 'partnership', component: PartnershipComponent, data: { animation: 'partnership' } },
  { path: 'partner/:id', component: PartnerComponent, data: { animation: 'partner' } },
  { path: 'outputs', component: OutputsComponent, data: { animation: 'barrierItem' } },
  { path: 'resources', component: ResourcesComponent, data: { animation: 'benefitItem' } },

  { path: 'articles', component: ArticlesComponent, data: { animation: 'articles' } },
  { path: 'articles/:id', component: ArticleComponent, data: { animation: 'article' } },

  { path: 'leaflets', component: LeafletsComponent, data: { animation: 'leaflets' } },

  {
    path: 'learning',
    component: LearningLayoutComponent,
    data: { animation: 'learning' },
    children: [
      { path: '', component: LearningIntroComponent, data: { animation: 'learning' } },
      { path: 'flow', component: LearningFlowComponent, data: { animation: 'learningFlow' } },
      { path: 'modules', component: ModulesLibraryComponent, data: { animation: 'modules' } },
      { path: 'your-modules', component: YourModulesComponent, data: { animation: 'yourModules' } },
      { path: 'questionnaire', component: QuestionnaireComponent, data: { animation: 'questionnaire' } },
      { path: 'dashboard', component: DashboardComponent, data: { animation: 'dashboard' } },
    ]
  },

  { path: 'flipbook/:skillId', component: FlipbookComponent, data: { animation: 'flipbook' } },

  { path: 'escape-rooms', component: EscapeRoomsComponent, data: { animation: 'escapeRooms' } },

  { path: 'escape-rooms/empathy', component: EmpathySkill22Component, data: { animation: 'empathy' } },
  { path: 'escape-rooms/cultural-awareness', component: EscapeRoomComponent, data: { animation: 'cultural-awareness' } },
  { path: 'escape-rooms/strategic-thinking', component: StrategicThinkingSkill16Component, data: { animation: 'strategic-thinking' } },
  { path: 'escape-rooms/open-mindedness', component: OpenMindnessSkillSkill26Component, data: { animation: 'open-mindness' } },
  { path: 'escape-rooms/financial', component: FinancialSkill10BComponent, data: { animation: 'financial-b' } },
  { path: 'escape-rooms/stress-management', component: StressManagementSkill17Component, data: { animation: 'stress-management' } },
  { path: 'escape-rooms/trust-building', component: TrustBuildingSkill18Component, data: { animation: 'trust-building' } },
  { path: 'escape-rooms/active-listening', component: ActiveListeningSkill19Component, data: { animation: 'active-listening' } },
  { path: 'escape-rooms/adaptability', component: AdaptabilitySkill20Component, data: { animation: 'adaptability' } },
  { path: 'escape-rooms/flexibility', component: FlexibilitySkill23Component, data: { animation: 'flexibility' } },
  { path: 'escape-rooms/interpersonal-skills', component: InterpersonalSkillsSkill24Component, data: { animation: 'interpersonal-skills' } },
  { path: 'escape-rooms/language-skills', component: LanguageSkillsSkill25Component, data: { animation: 'language-skills' } },
  { path: 'escape-rooms/market-awareness', component: MarketAwarenessSkill21Component, data: { animation: 'market-awareness' } },
  { path: 'escape-rooms/legal-compliance', component: LegalComplianceSkill20Component, data: { animation: 'legal-compliance' } },
  { path: 'escape-rooms/self-reliance', component: SelfRelianceSkill28Component, data: { animation: 'self-reliance' } },
  { path: 'escape-rooms/resilience', component: ResilienceSkill27Component, data: { animation: 'resilience' } },
  { path: 'escape-rooms/teamwork', component: TeamworkSkill29Component, data: { animation: 'teamwork' } },
  { path: 'escape-rooms/motivating-others', component: MotivatingOthersComponent, data: { animation: 'motivating-others' } },
  { path: 'escape-rooms/tolerance', component: ToleranceSkill30Component, data: { animation: 'tolerance' } },
  { path: 'escape-rooms/leadership', component: LeadershipSkill19Component, data: { animation: 'leadership' } },
  { path: 'escape-rooms/decision-making', component: DecisionMakingModule4Component, data: { animation: 'decision-making' } },
  { path: 'escape-rooms/crm', component: CrmModule3Component, data: { animation: 'crm' } },
  { path: 'escape-rooms/business-planning', component: BusinessPlanningModule1Component, data: { animation: 'business-planning' } },
  { path: 'escape-rooms/critical-thinking', component: CriticalThinkingModule2Component, data: { animation: 'critical-thinking' } },
  { path: 'escape-rooms/digital-skills', component: DigitalSkillsModule5Component, data: { animation: 'digital-skills' } },
  { path: 'escape-rooms/negotiation-skills', component: NegotiationSkillsModule11Component, data: { animation: 'negotiation-skills' } },
  { path: 'escape-rooms/networking-skills', component: NetworkingSkillsModule12Component, data: { animation: 'networking-skills' } },
  { path: 'escape-rooms/risk-management', component: RiskManagementModule15Component, data: { animation: 'risk-management' } },
  { path: 'escape-rooms/problem-solving', component: ProblemSolvingModule13Component, data: { animation: 'problem-solving' } },
  { path: 'escape-rooms/project-management', component: ProjectManagementModule14Component, data: { animation: 'project-management' } },

];


@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
