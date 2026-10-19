import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const LIMITS = { customer_name: 100, contact: 200, subject: 150, description: 2000 };

const LABELS = {
  customer_name: 'Customer name',
  contact: 'Contact (phone or email)',
  subject: 'Subject',
  description: 'Description',
};

// Same rules as the server. The server still checks again.
function validate(values) {
  const errors = {};
  for (const field of Object.keys(LABELS)) {
    const v = values[field].trim();
    if (!v) errors[field] = `${LABELS[field]} is required`;
    else if (v.length > LIMITS[field]) errors[field] = `Keep this under ${LIMITS[field]} characters`;
  }
  return errors;
}

export default function CreateInquiryPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ customer_name: '', contact: '', subject: '', description: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [duplicateId, setDuplicateId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    // Once a field has been visited, keep its error up to date as the user types
    if (touched[name]) setErrors(validate(next));
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(validate(values));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setDuplicateId(null);

    const found = validate(values);
    setErrors(found);
    setTouched({ customer_name: true, contact: true, subject: true, description: true });
    if (Object.keys(found).length > 0) return; // stop here, the messages are shown under the fields

    setSubmitting(true);
    try {
      const data = await api.createInquiry(values);
      navigate(`/inquiries/${data.inquiry.id}`);
    } catch (err) {
      if (err.status === 400 && err.fields.length > 0) {
        // The server found a problem the browser missed: show it under the right field
        const serverErrors = {};
        err.fields.forEach(f => { serverErrors[f.field] = f.message; });
        setErrors(serverErrors);
      } else if (err.status === 409 && err.body?.existing_id) {
        setFormError(err.message);
        setDuplicateId(err.body.existing_id);
      } else {
        setFormError(err.message); // network failure, 401, 500, and so on
      }
      setSubmitting(false);
    }
  }

  function field(name, label, Tag = 'input', extra = {}) {
    const showError = touched[name] && errors[name];
    return (
      <>
        <label htmlFor={name}>{label}</label>
        <Tag
          id={name}
          name={name}
          value={values[name]}
          onChange={handleChange}
          onBlur={handleBlur}
          className={showError ? 'invalid' : ''}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${name}-error` : undefined}
          {...extra}
        />
        {showError && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}
      </>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h1>New inquiry</h1>
      <p className="muted">Record what the customer asked so nothing gets lost.</p>

      {field('customer_name', 'Customer name')}
      {field('contact', 'Contact (phone or email)')}
      {field('subject', 'Subject')}
      {field('description', 'Description', 'textarea', { rows: 5 })}

      {formError && (
        <p className="error" role="alert">
          {formError}{' '}
          {duplicateId && <Link to={`/inquiries/${duplicateId}`}>View the existing inquiry</Link>}
        </p>
      )}

      <div className="actions">
        <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save inquiry'}</button>
        <Link to="/"><button type="button" className="secondary">Cancel</button></Link>
      </div>
    </form>
  );
}