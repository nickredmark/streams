import React from 'react';
import marked from 'marked';

export const Markdown = ({ content }) => <div dangerouslySetInnerHTML={{ __html: marked(content, { sanitize: true }) }} />