/**
 * 标签输入组件
 * 支持输入、自动补全、最近使用标签
 */
import { Tag, Space, AutoComplete, Button } from 'antd'
import { useState, useEffect, useMemo } from 'react'
import { PlusOutlined } from '@ant-design/icons'
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
  placeholder = '输入标签后按回车键添加',
  recentTags = [],
  allTags = [],
}) => {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<AutoCompleteProps['options']>([])
  const [focused, setFocused] = useState(false)
  
  // 确保value始终是数组
  const normalizedValue = useMemo(() => {
    return Array.isArray(value) ? value : (value ? [value] : [])
  }, [value])

  // 更新自动补全选项
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags
        .filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) && 
          !normalizedValue.includes(tag)
        )
        .slice(0, 10)
        .map(tag => ({ 
          value: tag, 
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{tag}</span>
              <span style={{ fontSize: 11, color: '#999' }}>点击选择</span>
            </div>
          )
        }))
      
      setOptions(filtered.length > 0 ? filtered : undefined)
    } else if (focused) {
      // 显示最近使用的标签
      const recentOptions = recentTags
        .filter(tag => !normalizedValue.includes(tag))
        .slice(0, 8)
        .map(tag => ({ 
          value: tag, 
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{tag}</span>
              <span style={{ fontSize: 11, color: '#1890ff' }}>最近使用</span>
            </div>
          )
        }))
      setOptions(recentOptions.length > 0 ? recentOptions : undefined)
    } else {
      setOptions(undefined)
    }
  }, [inputValue, allTags, recentTags, normalizedValue, focused])

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !normalizedValue.includes(trimmedTag)) {
      onChange?.([...normalizedValue, trimmedTag])
      setInputValue('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange?.(normalizedValue.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && normalizedValue.length > 0) {
      // 按退格键删除最后一个标签
      handleRemoveTag(normalizedValue[normalizedValue.length - 1])
    }
  }

  const handleSelect = (selectedValue: string) => {
    handleAddTag(selectedValue)
  }

  // 可用的推荐标签（未添加的）
  const availableTags = useMemo(() => {
    return allTags.filter(tag => !normalizedValue.includes(tag)).slice(0, 10)
  }, [allTags, normalizedValue])

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <AutoComplete
          value={inputValue}
          onChange={setInputValue}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // 延迟设置focused为false，以便点击选项时能正确触发
            setTimeout(() => setFocused(false), 200)
          }}
          options={options}
          placeholder={placeholder}
          allowClear
          size="large"
          style={{
            width: '100%',
            borderRadius: 8,
          }}
        />
      </div>
      
      {/* 已添加的标签 */}
      {normalizedValue.length > 0 && (
        <div style={{ 
          marginTop: 12, 
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: 8,
          border: '1px solid #e8e8e8',
          minHeight: 48,
        }}>
          <Space size={[8, 8]} wrap style={{ width: '100%' }}>
            {normalizedValue.map(tag => (
              <Tag
                key={tag}
                closable
                onClose={(e) => {
                  e.preventDefault()
                  handleRemoveTag(tag)
                }}
                style={{
                  margin: 0,
                  padding: '4px 12px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ff4d4f'
                  e.currentTarget.style.background = '#fff1f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d9d9d9'
                  e.currentTarget.style.background = '#fff'
                }}
              >
                <span>{tag}</span>
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 快速添加推荐标签（仅在无输入且无已添加标签时显示） */}
      {!inputValue && normalizedValue.length === 0 && availableTags.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ 
            fontSize: 12, 
            color: '#8c8c8c', 
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span>💡</span>
            <span>快速添加：</span>
          </div>
          <Space size={[6, 6]} wrap>
            {availableTags.slice(0, 6).map(tag => (
              <Button
                key={tag}
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => handleAddTag(tag)}
                style={{
                  fontSize: 12,
                  height: 28,
                  borderRadius: 6,
                  borderColor: '#d9d9d9',
                  color: '#595959',
                }}
              >
                {tag}
              </Button>
            ))}
          </Space>
        </div>
      )}
    </div>
  )
}

export default TagsInput

