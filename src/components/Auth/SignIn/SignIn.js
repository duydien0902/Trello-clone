import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  EMAIL_RULE,
  PASSWORD_RULE,
  FIELD_REQUIRED_MESSAGE,
  PASSWORD_RULE_MESSAGE,
  EMAIL_RULE_MESSAGE,
  fieldErrorMessage
} from 'utilities/validators'

import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { signInUserAPI } from 'redux/user/userSlice'
import { useDispatch } from 'react-redux'

function SignIn() {
  const dispatch = useDispatch()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const navigate = useNavigate()

  const onSubmitSignIn = (data) => {
    toast.promise(dispatch(signInUserAPI(data)), { pending: 'Signing up...' })
      .then(res => {
        if (!res.error) navigate('/')
      })
  }

  let [searchParams] = useSearchParams()
  const registeredEmail = searchParams.get('registeredEmail')
  const verifiedEmail = searchParams.get('verifiedEmail')

  return (
    <form className="auth__form form__sign-in" onSubmit={handleSubmit(onSubmitSignIn)}>
      <h2 className="auth__form__title">Sign In</h2>

      {registeredEmail && <div className='auth__form_message success'>
        <div>An email has been sent to <strong>{registeredEmail}</strong></div>
        <div>Please check and verify your account before login!</div>
      </div>}

      {verifiedEmail && <div className='auth__form_message success'>
        <div>Your email <strong>{verifiedEmail}</strong> has been verified.</div>
        <div>Please sign-in to enjoy our services! Thank you!</div>
      </div>}

      <div className="auth__form__input-field">
        <i className="fa fa-envelope"></i>
        <input
          type="text"
          // name="email"
          // autoComplete='nope' //tat de xuat email tren trinh duyet
          placeholder="Email"
          {...register('email', {
            required: FIELD_REQUIRED_MESSAGE,
            pattern: {
              value: EMAIL_RULE,
              message: EMAIL_RULE_MESSAGE
            }
          })}
        />
      </div>
      {/* { errors?.email && <span>{errors?.email.message}</span>} */}
      {fieldErrorMessage(errors, 'email')}


      <div className="auth__form__input-field">
        <i className="fa fa-lock"></i>
        <input
          type="password"
          // name="password"
          placeholder="Password"
          {...register('password', {
            required: FIELD_REQUIRED_MESSAGE,
            pattern: {
              value: PASSWORD_RULE,
              message: PASSWORD_RULE_MESSAGE
            }
          })}
        />
      </div>
      {fieldErrorMessage(errors, 'password')}

      <button className="auth__form__submit" type="submit">Sign In</button>
    </form>
  )
}

export default SignIn