import { InputBase, PasswordInput, Select, TextInput } from '@mantine/core'
import { DatePicker, DatePickerInput, DateTimePicker } from '@mantine/dates'

import datePickerClassNames from '@shared/ui/date-time-picker/date-time-picker.module.css'

export default {
    InputBase: InputBase.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    PasswordInput: PasswordInput.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    TextInput: TextInput.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    Select: Select.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    DateTimePicker: DateTimePicker.extend({
        classNames: datePickerClassNames,
        defaultProps: {
            radius: 'md'
        }
    }),
    DatePickerInput: DatePickerInput.extend({
        classNames: datePickerClassNames
    }),
    DatePicker: DatePicker.extend({
        classNames: datePickerClassNames
    })
}
