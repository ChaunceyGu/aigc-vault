/**
 * 标签输入组件
 * 支持输入、自动补全、最近使用标签
 */
import { Tag, Space, AutoComplete } from 'antd'
import { useState, useEffect } from 'react'
import type { AutoCompleteProps } from 'antd'

interface TagsInputProps {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  recentTags?: string[]
  allTags?: string[]
}

const TagsInput: React.FC<TagsInputProps> = ({
  value = [],
  onChange,
  placeholder = '输入标签后按回车',
  recentTags = [],
  allTags = [],
}) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<AutoCompleteProps['options']>([])

  // 更新自动补全选项
  useEffect(() => {
    if (inputValue) {
      const filtered = allTags
        .filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) && 
          !value.includes(tag)
        )
        .slice(0, 10)
        .map(tag => ({ value: tag, label: tag }))
      
      setOptions(filtered.length > 0 ? filtered : undefined)
    } else {
      // 显示最近使用的标签
      const recentOptions = recentTags
        .filter(tag => !value.includes(tag))
        .slice(0, 5)
        .map(tag => ({ value: tag, label: tag }))
      setOptions(recentOptions.length > 0 ? recentOptions : undefined)
    }
  }, [inputValue, allTags, recentTags, value])

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange?.([...value, trimmedTag])
      setInputValue('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange?.(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag(inputValue)
    }
  }

  const handleSelect = (value: string) => {
    handleAddTag(value)
  }

  return (
    <div>
      <AutoComplete
        style={{ width: '100%' }}
        value={inputValue}
        onChange={setInputValue}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        options={options}
        placeholder={placeholder}
        allowClear
      />
      {value.length > 0 && (
        <Space size={[8, 8]} wrap style={{ marginTop: 8 }}>
          {value.map(tag => (
            <Tag
              key={tag}
              closable
              onClose={() => handleRemoveTag(tag)}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      )}
    </div>
  )
}

export default TagsInput

