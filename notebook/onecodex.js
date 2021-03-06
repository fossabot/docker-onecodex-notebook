define([
  'base/js/utils',
  'base/js/dialog'
], function(utils, dialog) {
  return {
    ExportModal: (default_file_name) => {
      const ONE_CODEX_DOCS_URL = 'https://app.onecodex.com/documents';
      const SPINNER_SVG_URL = '../custom/one-codex-spinner.svg';

      var makeSpinnerSVG = (alertMsg) => {
        return `<table width="100%"><tr><td width="5%" style="padding: 5px">
                <object data="${SPINNER_SVG_URL}" type="image/svg+xml" width="30px" height="30px" style="position: relative; top: 2px" />
                </td><td width="95%">${alertMsg}</td></tr></table>`;
      };

      var formGroup = document.createElement('div');
      formGroup.className = 'form-group';

      var alertBox = document.createElement('div');
      alertBox.className = 'hidden';
      formGroup.appendChild(alertBox);

      var nameLabel = document.createElement('label');
      nameLabel.for = 'pdf-report-filename';
      nameLabel.innerHTML = 'Choose a filename for this PDF report';
      formGroup.appendChild(nameLabel);

      var nameInput = document.createElement('input');
      nameInput.id = 'pdf-report-filename';
      nameInput.type = 'text';
      nameInput.className = 'form-control';
      nameInput.value = default_file_name;
      formGroup.appendChild(nameInput);

      var d = dialog.modal({
        title: 'Export PDF report to One Codex Document Portal',
        body: formGroup,
        keyboard_manager: IPython.keyboard_manager,
        default_button: 'Save',
        buttons: {
          'Save': {
            'id': 'one-codex-save-button',
            'class': 'btn-primary',
            'click': () => {
              alertBox.innerHTML = '';
              alertBox.className = 'hidden';

              if (nameInput.value === '') {
                alertBox.innerHTML = 'Please specify a valid filename ending in .pdf.';
                alertBox.className = 'alert alert-danger';
                return false;
              } else if (nameInput.value.length > 100) {
                alertBox.innerHTML = 'Filenames must be less than 100 characters long.';
                alertBox.className = 'alert alert-danger';
                return false;
              }

              if (nameInput.value.endsWith('.pdf') !== true) {
                nameInput.value = `${nameInput.value}.pdf`;
              }

              var notebook_path = utils.encode_uri_components(IPython.notebook.notebook_path);
              var url = utils.url_path_join(
                IPython.menubar.base_url,
                'nbconvert',
                'onecodex_doc',
                notebook_path
              ) + '?one_codex_doc_portal_filename=' + nameInput.value + '&download=false';

              // disable elements while awaiting response
              document.getElementById('pdf-report-filename').readOnly = true;
              document.getElementById('one-codex-save-button').disabled = true;
              document.getElementById('one-codex-run-all-save-button').disabled = true;
              alertBox.innerHTML = makeSpinnerSVG('&nbsp;&nbsp; Rendering notebook and uploading. Usually takes less than a minute.');
              alertBox.className = 'alert alert-info no-padding';

              // honestly, the only reason to use setTimeout here is so our SVG spinner starts spinning
              setTimeout(() => {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onload = () => {
                  if (xhr.status === 500) {
                      alertBox.innerHTML = 'Notebook returned 500 error. Please contact help@onecodex.com for assistance.';
                      alertBox.className = 'alert alert-danger';
                      document.getElementById('pdf-report-filename').readOnly = false;
                      document.getElementById('one-codex-save-button').disabled = false;
                      document.getElementById('one-codex-run-all-save-button').disabled = false;
                  } else {
                    try {
                      var resp_json = JSON.parse(xhr.responseText);
                    } catch(e) {
                      var resp_json = {
                        'status': 500,
                        'message': 'Unspecified error. Please contact help@onecodex.com for assistance.'
                      }
                    }

                    if (resp_json['status'] === 500) {
                      alertBox.innerHTML = 'Upload failed. The server said:<br><br>' + resp_json['message'];
                      alertBox.className = 'alert alert-danger';
                      document.getElementById('pdf-report-filename').readOnly = false;
                      document.getElementById('one-codex-save-button').disabled = false;
                      document.getElementById('one-codex-run-all-save-button').disabled = false;
                    } else {
                      alertBox.innerHTML = 'Export successful! View the report here: <a href="' + 
                        ONE_CODEX_DOCS_URL + '" target="_blank" class="alert-link">Documents Portal</a>';
                      alertBox.className = 'alert alert-success';
                      document.getElementById('one-codex-save-button').className = 'hidden';
                      document.getElementById('one-codex-run-all-save-button').className = 'hidden';
                      document.getElementById('one-codex-cancel-button').innerHTML = 'Return to Notebook';
                    }
                  }
                };
                xhr.send();
              }, 500);
            }
          },
          'Run All And Save': {
            'id': 'one-codex-run-all-save-button',
            'class': 'btn-secondary',
            'click': () => {
              // disable elements while awaiting response
              document.getElementById('pdf-report-filename').readOnly = true;
              document.getElementById('one-codex-save-button').disabled = true;
              document.getElementById('one-codex-run-all-save-button').disabled = true;
              alertBox.innerHTML = makeSpinnerSVG('&nbsp;&nbsp; Executing cells in notebook. Some notebooks may take a few minutes.');
              alertBox.className = 'alert alert-info no-padding';

              IPython.notebook.clear_all_output();
              IPython.notebook.execute_all_cells();

              let count_polls_not_busy = 0;

              let wait_for_ipython = setInterval(() => {
                if (IPython.notebook.kernel_busy === false) {
                  count_polls_not_busy++;
                } else {
                  count_polls_not_busy = 0;
                }

                if (count_polls_not_busy >= 4) {
                  clearInterval(wait_for_ipython);
                  document.getElementById('one-codex-save-button').disabled = false;
                  document.getElementById('one-codex-save-button').click();
                  document.getElementById('one-codex-save-button').disabled = true;
                }
              }, 1000);
            }
          },
          'Cancel': {
            'id': 'one-codex-cancel-button',
            'class': 'btn'
          }
        }
      });
    }
  }
});
