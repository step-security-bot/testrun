/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { DeviceValidators } from '../../devices/components/device-form/device.validators';
import {
  FormControlType,
  Profile,
  ProfileFormat,
  ProfileStatus,
  Question,
  Validation,
} from '../../../model/profile';
import { ProfileValidators } from './profile.validators';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    TextFieldModule,
  ],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent implements OnInit {
  private profile: Profile | null = null;
  private profileList!: Profile[];
  private injector = inject(Injector);
  private nameValidator!: ValidatorFn;
  public readonly FormControlType = FormControlType;
  public readonly ProfileStatus = ProfileStatus;
  profileForm: FormGroup = this.fb.group({});
  @ViewChildren(CdkTextareaAutosize)
  autosize!: QueryList<CdkTextareaAutosize>;
  @Input() profileFormat!: ProfileFormat[];
  @Input()
  set profiles(profiles: Profile[]) {
    this.profileList = profiles;
    if (this.nameControl) {
      this.updateNameValidator();
    }
  }
  get profiles() {
    return this.profileList;
  }
  @Input()
  set selectedProfile(profile: Profile | null) {
    this.profile = profile;
    if (profile && this.nameControl) {
      this.updateNameValidator();
      this.fillProfileForm(this.profileFormat, profile);
    }
  }
  get selectedProfile() {
    return this.profile;
  }

  @Output() saveProfile = new EventEmitter<Profile>();
  constructor(
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    private fb: FormBuilder
  ) {}
  ngOnInit() {
    this.profileForm = this.createProfileForm(this.profileFormat);
    if (this.selectedProfile) {
      this.fillProfileForm(this.profileFormat, this.selectedProfile);
    }
  }

  get isDraftDisabled(): boolean {
    return !this.nameControl.valid || this.fieldsHasError;
  }

  private get fieldsHasError(): boolean {
    return this.profileFormat.some((field, index) => {
      return (
        this.getControl(index).hasError('invalid_format') ||
        this.getControl(index).hasError('maxlength')
      );
    });
  }

  get nameControl() {
    return this.getControl('name');
  }

  getControl(name: string | number) {
    return this.profileForm.get(name.toString()) as AbstractControl;
  }

  createProfileForm(questions: ProfileFormat[]): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group: any = {};

    this.nameValidator = this.profileValidators.differentProfileName(
      this.profiles,
      this.profile
    );

    group['name'] = new FormControl('', [
      this.profileValidators.textRequired(),
      this.deviceValidators.deviceStringFormat(),
      this.nameValidator,
    ]);

    questions.forEach((question, index) => {
      if (question.type === FormControlType.SELECT_MULTIPLE) {
        group[index] = this.getMultiSelectGroup(question);
      } else {
        const validators = this.getValidators(
          question.type,
          question.validation
        );
        group[index] = new FormControl(question.default || '', validators);
      }
    });
    return new FormGroup(group);
  }

  getValidators(type: FormControlType, validation?: Validation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (validation) {
      if (validation.required) {
        validators.push(this.profileValidators.textRequired());
      }
      if (validation.max) {
        validators.push(Validators.maxLength(Number(validation.max)));
      }
      if (type === FormControlType.EMAIL_MULTIPLE) {
        validators.push(this.profileValidators.emailStringFormat());
      }
      if (type === FormControlType.TEXT || type === FormControlType.TEXTAREA) {
        validators.push(this.profileValidators.textFormat());
      }
    }
    return validators;
  }

  getMultiSelectGroup(question: ProfileFormat): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group: any = {};
    question.options?.forEach((option, index) => {
      group[index] = false;
    });
    return this.fb.group(group, {
      validators: question.validation?.required
        ? [this.profileValidators.multiSelectRequired]
        : [],
    });
  }

  getFormGroup(name: string | number): FormGroup {
    return this.profileForm?.controls[name] as FormGroup;
  }

  fillProfileForm(profileFormat: ProfileFormat[], profile: Profile): void {
    this.nameControl.setValue(profile.name);
    profileFormat.forEach((question, index) => {
      if (question.type === FormControlType.SELECT_MULTIPLE) {
        question.options?.forEach((item, idx) => {
          if ((profile.questions[index].answer as number[])?.includes(idx)) {
            this.getFormGroup(index).controls[idx].setValue(true);
          } else {
            this.getFormGroup(index).controls[idx].setValue(false);
          }
        });
      } else {
        this.getControl(index).setValue(profile.questions[index].answer);
      }
    });
    this.triggerResize();
  }

  onSaveClick(status: ProfileStatus) {
    const response = this.buildResponseFromForm(
      this.profileFormat,
      this.profileForm,
      status,
      this.selectedProfile
    );
    this.saveProfile.emit(response);
  }

  public markSectionAsDirty(
    optionIndex: number,
    optionLength: number,
    formControlName: string
  ) {
    if (optionIndex === optionLength - 1) {
      this.getControl(formControlName).markAsDirty();
    }
  }

  private buildResponseFromForm(
    initialQuestions: ProfileFormat[],
    profileForm: FormGroup,
    status: ProfileStatus,
    profile: Profile | null
  ): Profile {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request: any = {
      questions: [],
    };
    if (profile) {
      request.name = profile.name;
      request.rename = this.nameControl.value?.trim();
    } else {
      request.name = this.nameControl.value?.trim();
    }
    const questions: Question[] = [];

    initialQuestions.forEach((initialQuestion, index) => {
      const question: Question = {};
      question.question = initialQuestion.question;

      if (initialQuestion.type === FormControlType.SELECT_MULTIPLE) {
        const answer: number[] = [];
        initialQuestion.options?.forEach((_, idx) => {
          const value = profileForm.value[index][idx];
          if (value) {
            answer.push(idx);
          }
        });
        question.answer = answer;
      } else {
        question.answer = profileForm.value[index]?.trim();
      }
      questions.push(question);
    });
    request.questions = questions;
    request.status = status;
    return request;
  }

  private triggerResize() {
    // Wait for content to render, then trigger textarea resize.
    afterNextRender(
      () => {
        this.autosize?.forEach(item => item.resizeToFitContent(true));
      },
      {
        injector: this.injector,
      }
    );
  }

  private updateNameValidator() {
    this.nameControl.removeValidators([this.nameValidator]);
    this.nameValidator = this.profileValidators.differentProfileName(
      this.profileList,
      this.profile
    );
    this.nameControl.addValidators(this.nameValidator);
    this.nameControl.updateValueAndValidity();
  }
}
